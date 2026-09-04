#!/usr/bin/env python3
"""Crea un proyecto Supabase nuevo, aplica el schema y actualiza supabase-config.js.

Uso:
  SUPABASE_ACCESS_TOKEN=sbp_xxx python3 scripts/setup-new-supabase.py
"""
from __future__ import annotations

import json
import os
import re
import secrets
import string
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = "https://api.supabase.com/v1"
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
NAME = os.environ.get("SUPABASE_PROJECT_NAME", "viva-pinata").strip()
REGION = os.environ.get("SUPABASE_REGION", "us-east-1").strip()
DB_PASS = os.environ.get("SUPABASE_DB_PASSWORD", "").strip()


def die(msg: str, code: int = 1) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(code)


def api(method: str, path: str, body: dict | None = None, timeout: int = 90):
    data = None
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8") or "null"
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            parsed = raw
        return e.code, parsed


def gen_password(n: int = 28) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(n)) + "Aa1!"


def pick_anon_key(keys_payload) -> str:
    items = keys_payload
    if isinstance(keys_payload, dict):
        items = keys_payload.get("api_keys") or keys_payload.get("keys") or []
    if not isinstance(items, list):
        return ""
    anon = ""
    publishable = ""
    for k in items:
        if not isinstance(k, dict):
            continue
        name = str(k.get("name") or "").lower()
        typ = str(k.get("type") or "").lower()
        val = k.get("api_key") or k.get("key") or k.get("apiKey") or ""
        if not val:
            continue
        if typ == "anon" or name in ("anon", "anon key"):
            anon = val
        if typ == "publishable" or "publishable" in name:
            publishable = val
    return anon or publishable


def apply_sql(ref: str, schema: str) -> bool:
    for path, body in [
        (f"/projects/{ref}/database/query", {"query": schema}),
        (f"/projects/{ref}/db/query", {"query": schema}),
    ]:
        st, res = api("POST", path, body, timeout=120)
        print(f"    SQL {path} -> {st}: {str(res)[:240]}")
        if st in (200, 201):
            return True
    return False


def main() -> None:
    global DB_PASS

    if not TOKEN:
        die(
            "Falta SUPABASE_ACCESS_TOKEN. Genera uno en "
            "https://supabase.com/dashboard/account/tokens"
        )

    if not DB_PASS:
        DB_PASS = gen_password()

    print("==> Listando organizaciones")
    status, orgs = api("GET", "/organizations")
    if status != 200 or not isinstance(orgs, list) or not orgs:
        die(f"No pude listar orgs ({status}): {orgs}")
    org = orgs[0]
    org_id = org.get("id") or ""
    org_slug = org.get("slug") or org_id
    print(f"    org={org.get('name')} slug={org_slug} id={org_id}")

    print(f"==> Creando proyecto {NAME!r} en {REGION}")
    attempts = [
        {
            "name": NAME,
            "organization_id": org_id,
            "organization_slug": org_slug,
            "db_pass": DB_PASS,
            "region": REGION,
            "desired_instance_size": "micro",
        },
        {
            "name": NAME,
            "organization_slug": org_slug,
            "db_pass": DB_PASS,
            "region": REGION,
            "desired_instance_size": "micro",
        },
        {
            "name": NAME,
            "organization_slug": org_slug,
            "db_pass": DB_PASS,
            "region_selection": {"type": "smartGroup", "code": "americas"},
            "desired_instance_size": "micro",
        },
    ]
    created = None
    status = 0
    for body in attempts:
        status, created = api("POST", "/projects", body)
        print(f"    create attempt -> {status}: {str(created)[:240]}")
        if status in (200, 201) and isinstance(created, dict):
            break
    if status not in (200, 201) or not isinstance(created, dict):
        die(f"No pude crear proyecto ({status}): {created}")

    ref = created.get("ref") or created.get("id") or ""
    if not ref:
        die(f"Respuesta sin ref: {created}")
    print(f"    ref={ref}")

    print("==> Esperando ACTIVE_HEALTHY…")
    healthy = False
    for i in range(1, 91):
        st, info = api("GET", f"/projects/{ref}")
        proj_status = (info or {}).get("status") if isinstance(info, dict) else None
        print(f"    [{i}] {proj_status}")
        if proj_status in ("ACTIVE_HEALTHY", "ACTIVE"):
            healthy = True
            break
        time.sleep(8)
    if not healthy:
        die("El proyecto no llegó a ACTIVE a tiempo")

    print("==> Obteniendo API keys")
    st, keys = api("GET", f"/projects/{ref}/api-keys?reveal=true")
    if st != 200:
        st, keys = api("GET", f"/projects/{ref}/api-keys")
    anon = pick_anon_key(keys)
    if not anon:
        api("POST", f"/projects/{ref}/api-keys", {"type": "publishable", "name": "default"})
        time.sleep(2)
        st, keys = api("GET", f"/projects/{ref}/api-keys?reveal=true")
        anon = pick_anon_key(keys)
    if not anon:
        die(f"No encontré anon/publishable key: {keys}")

    url = f"https://{ref}.supabase.co"
    print(f"    url={url}")
    print(f"    key={anon[:18]}…")

    schema_path = ROOT / "supabase-schema.sql"
    if not schema_path.exists():
        die(f"No existe {schema_path}")
    schema = schema_path.read_text(encoding="utf-8")
    print("==> Aplicando supabase-schema.sql")
    if not apply_sql(ref, schema):
        print(
            "WARN: no pude aplicar SQL por API; habrá que pegarlo en SQL Editor",
            file=sys.stderr,
        )

    print("==> Probando REST app_config")
    req = urllib.request.Request(
        f"{url}/rest/v1/app_config?select=id&limit=1",
        headers={
            "apikey": anon,
            "Authorization": f"Bearer {anon}",
            "Accept": "application/json",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            print(f"    REST {resp.status}: {resp.read().decode()[:200]}")
    except urllib.error.HTTPError as e:
        print(f"    REST {e.code}: {e.read().decode(errors='replace')[:300]}")
    except Exception as e:  # noqa: BLE001
        print(f"    REST error: {e}")

    cfg_path = ROOT / "supabase-config.js"
    cfg = cfg_path.read_text(encoding="utf-8")
    cfg2, n = re.subn(
        r"window\.SUPABASE_CONFIG\s*=\s*\{[\s\S]*?\};",
        "window.SUPABASE_CONFIG = {\n"
        f'  url:     "{url}",\n'
        f'  anonKey: "{anon}",\n'
        "};",
        cfg,
        count=1,
    )
    if n != 1:
        die("No pude reemplazar window.SUPABASE_CONFIG en supabase-config.js")
    cfg_path.write_text(cfg2, encoding="utf-8")
    print(f"==> Actualizado {cfg_path.name}")

    sw = ROOT / "service-worker.js"
    sw_text = sw.read_text(encoding="utf-8")
    m = re.search(r'const CACHE_VERSION = "([^"]+)"', sw_text)
    if m:
        old = m.group(1)
        parts = old.rsplit(".", 1)
        if len(parts) == 2 and parts[1].isdigit():
            new = f"{parts[0]}.{int(parts[1]) + 1}"
        else:
            new = old + ".1"
        sw.write_text(sw_text.replace(f'"{old}"', f'"{new}"', 1), encoding="utf-8")
        print(f"==> CACHE_VERSION {old} -> {new}")

    info = ROOT / "PROJECT_INFO.md"
    if info.exists():
        t = info.read_text(encoding="utf-8")
        line = f"- **Proyecto actual:** `{ref}` · URL: `{url}`"
        if "**Proyecto actual:**" in t:
            t = re.sub(r"- \*\*Proyecto actual:\*\*.*", line, t)
        else:
            t += f"\n{line}\n"
        info.write_text(t, encoding="utf-8")
        print("==> PROJECT_INFO.md actualizado")

    secret_path = Path("/tmp/supabase-new-credentials.txt")
    secret_path.write_text(
        f"REF={ref}\nURL={url}\nANON_KEY={anon}\nDB_PASS={DB_PASS}\n",
        encoding="utf-8",
    )
    os.chmod(secret_path, 0o600)
    print(f"==> Credenciales privadas en {secret_path}")
    print("DONE")


if __name__ == "__main__":
    main()
