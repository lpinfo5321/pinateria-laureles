/* ============================================================
   SUPABASE CONFIG
   ------------------------------------------------------------
   El proyecto viejo (cmovllgbckjupficttal) quedó APAGADO (522)
   y ya NO se usa. Deja url/anonKey vacíos aquí, o pega los de
   un proyecto NUEVO. También puedes conectarlos desde la app:
   Configuración / Ajustes → Conectar proyecto nuevo.
   ============================================================ */
window.SUPABASE_CONFIG = {
  url:     "",
  anonKey: "",
};

/** Proyectos que nunca deben usarse (apagados / irrecuperables). */
window.SUPABASE_DEAD_REFS = ["cmovllgbckjupficttal"];

window.SUPABASE_CONFIG_STORAGE_KEY = "viva_supabase_config";

window.isDeadSupabaseUrl = function (url) {
  const u = String(url || "").toLowerCase();
  return (window.SUPABASE_DEAD_REFS || []).some((ref) => u.includes(String(ref).toLowerCase()));
};

window.getSupabaseConfig = function () {
  try {
    const raw = localStorage.getItem(window.SUPABASE_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.url && parsed.anonKey && !window.isDeadSupabaseUrl(parsed.url)) {
        return {
          url: String(parsed.url).trim().replace(/\/$/, ""),
          anonKey: String(parsed.anonKey).trim(),
        };
      }
      // Limpia override basura (proyecto muerto o incompleto)
      if (parsed && window.isDeadSupabaseUrl(parsed.url)) {
        localStorage.removeItem(window.SUPABASE_CONFIG_STORAGE_KEY);
      }
    }
  } catch (_) {}
  const base = window.SUPABASE_CONFIG || {};
  const url = String(base.url || "").trim().replace(/\/$/, "");
  const anonKey = String(base.anonKey || "").trim();
  if (!url || !anonKey || window.isDeadSupabaseUrl(url)) {
    return { url: "", anonKey: "" };
  }
  return { url, anonKey };
};

window.saveSupabaseConfig = function (url, anonKey) {
  const conf = {
    url: String(url || "").trim().replace(/\/$/, ""),
    anonKey: String(anonKey || "").trim(),
  };
  if (window.isDeadSupabaseUrl(conf.url)) {
    throw new Error("Ese proyecto viejo está apagado. Usa uno NUEVO de supabase.com.");
  }
  localStorage.setItem(window.SUPABASE_CONFIG_STORAGE_KEY, JSON.stringify(conf));
  return conf;
};

window.clearSupabaseConfigOverride = function () {
  localStorage.removeItem(window.SUPABASE_CONFIG_STORAGE_KEY);
};

window.CLOUD_FETCH_MS = 8000;
window.withCloudTimeout = function (promise, ms) {
  const limit = ms || window.CLOUD_FETCH_MS || 8000;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const err = new Error("La nube no responde");
        err.name = "CloudTimeout";
        reject(err);
      }, limit);
    }),
  ]);
};

window.testSupabaseConfig = async function (conf) {
  conf = conf || window.getSupabaseConfig();
  if (!conf.url || !conf.anonKey) throw new Error("Faltan la URL o la clave");
  if (window.isDeadSupabaseUrl(conf.url)) {
    throw new Error("Ese proyecto viejo está apagado (522). Crea uno NUEVO en supabase.com.");
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(conf.url + "/rest/v1/app_config?select=id&limit=1", {
      headers: {
        apikey: conf.anonKey,
        Authorization: "Bearer " + conf.anonKey,
        Accept: "application/json",
      },
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (res.status === 522 || res.status === 521 || res.status === 523) {
      throw new Error("Este proyecto está apagado (error " + res.status + "). Crea uno NUEVO en supabase.com.");
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("La clave no es válida. Copia la anon public / publishable key del proyecto nuevo.");
    }
    if (res.status === 404 || /relation|does not exist|PGRST/i.test(text)) {
      throw new Error("Conectó, pero faltan las tablas. Pega supabase-schema.sql en SQL Editor y dale Run.");
    }
    if (!res.ok) {
      throw new Error("HTTP " + res.status + ": " + text.slice(0, 140));
    }
    return { ok: true, status: res.status };
  } catch (e) {
    if (e && e.name === "AbortError") {
      throw new Error("No contestó en 8s. Ese proyecto está caído o la URL está mal.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
};

window.hideCloudDownBanner = function () {
  const bar = document.getElementById("vpCloudDown");
  if (!bar) return;
  bar.remove();
  if (document.body) document.body.style.paddingTop = "";
};

window.showCloudDownBanner = function (opts) {
  opts = opts || {};
  const missing = !!opts.missing;
  if (document.getElementById("vpCloudDown")) {
    const setup = document.getElementById("vpCloudDownSetup");
    if (setup) setup.onclick = () => window.openSupabaseSetup();
    return;
  }
  const bar = document.createElement("div");
  bar.id = "vpCloudDown";
  bar.setAttribute("role", "status");
  bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483645;background:#7f1d1d;color:#fff;padding:10px 12px;font:700 13px/1.4 'Plus Jakarta Sans',system-ui,sans-serif;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.22)";
  const msg = missing
    ? "Sin nube conectada. La app funciona en local; para sync entre dispositivos conecta Supabase."
    : "La nube no responde. La app sigue en modo local.";
  bar.innerHTML = msg + ' <button type="button" id="vpCloudDownSetup" style="margin:4px 4px 0;border:0;border-radius:999px;padding:6px 12px;background:#fff;color:#7f1d1d;font-weight:800;cursor:pointer">Conectar proyecto nuevo</button><button type="button" id="vpCloudDownRetry" style="margin:4px 4px 0;border:0;border-radius:999px;padding:6px 12px;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.5);font-weight:800;cursor:pointer">Reintentar</button>';
  const mount = () => {
    if (!document.body) return false;
    document.body.prepend(bar);
    document.body.style.paddingTop = "56px";
    const setup = document.getElementById("vpCloudDownSetup");
    const retry = document.getElementById("vpCloudDownRetry");
    if (setup) setup.onclick = () => window.openSupabaseSetup();
    if (retry) retry.onclick = () => location.reload();
    return true;
  };
  if (!mount()) document.addEventListener("DOMContentLoaded", mount, { once: true });
};

window.openSupabaseSetup = function () {
  if (document.getElementById("vpSbSetup")) {
    document.getElementById("vpSbSetup").hidden = false;
    return;
  }
  const current = window.getSupabaseConfig();
  const wrap = document.createElement("div");
  wrap.id = "vpSbSetup";
  wrap.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:flex-end;justify-content:center;background:rgba(17,24,39,.55);padding:16px";
  wrap.innerHTML = `
    <div style="width:min(520px,100%);max-height:min(92vh,720px);overflow:auto;background:#fff;border-radius:22px;padding:20px 18px 18px;box-shadow:0 24px 80px rgba(0,0,0,.28);font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#171717">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
        <h2 style="margin:0;font:900 20px/1.2 Fraunces,Georgia,serif">Conectar Supabase nuevo</h2>
        <button type="button" id="vpSbClose" style="border:0;background:#f3f4f6;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:16px">✕</button>
      </div>
      <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#6b7280">La conexión anterior se eliminó porque el proyecto viejo está apagado. Crea un proyecto <strong>nuevo</strong> (gratis) y pega aquí sus datos.</p>
      <ol style="margin:0 0 14px 18px;padding:0;font-size:13px;line-height:1.55;color:#374151">
        <li>Entra a <a href="https://supabase.com/dashboard" target="_blank" rel="noopener">supabase.com/dashboard</a></li>
        <li>New project → nombre <strong>viva-pinata</strong> → región cercana → Create</li>
        <li>SQL Editor → New query → pega el SQL (botón abajo) → Run</li>
        <li>Project Settings → API → copia <strong>Project URL</strong> y <strong>anon public</strong> (o publishable)</li>
      </ol>
      <label style="display:block;font-size:12px;font-weight:800;margin:0 0 6px">Project URL</label>
      <input id="vpSbUrl" type="url" spellcheck="false" placeholder="https://xxxxx.supabase.co" style="width:100%;box-sizing:border-box;margin-bottom:10px;padding:11px 12px;border:1.5px solid #e5e7eb;border-radius:12px;font:600 13px/1.3 ui-monospace,monospace" />
      <label style="display:block;font-size:12px;font-weight:800;margin:0 0 6px">anon / publishable key</label>
      <textarea id="vpSbKey" rows="3" spellcheck="false" placeholder="eyJ... o sb_publishable_..." style="width:100%;box-sizing:border-box;margin-bottom:10px;padding:11px 12px;border:1.5px solid #e5e7eb;border-radius:12px;font:600 12px/1.35 ui-monospace,monospace;resize:vertical"></textarea>
      <div id="vpSbMsg" style="min-height:18px;font-size:12px;font-weight:700;margin-bottom:10px;color:#6b7280"></div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <button type="button" id="vpSbTest" style="border:0;border-radius:12px;padding:11px 14px;background:#f3f4f6;font-weight:800;cursor:pointer">Probar conexión</button>
        <button type="button" id="vpSbSave" style="border:0;border-radius:12px;padding:11px 14px;background:linear-gradient(135deg,#ec4899,#a855f7);color:#fff;font-weight:800;cursor:pointer">Guardar y recargar</button>
        <button type="button" id="vpSbSql" style="border:0;border-radius:12px;padding:11px 14px;background:#111827;color:#fff;font-weight:800;cursor:pointer">Copiar SQL</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
  const urlEl = document.getElementById("vpSbUrl");
  const keyEl = document.getElementById("vpSbKey");
  const msgEl = document.getElementById("vpSbMsg");
  urlEl.value = current.url || "";
  keyEl.value = current.anonKey || "";

  const close = () => { wrap.remove(); };
  document.getElementById("vpSbClose").onclick = close;
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });

  document.getElementById("vpSbTest").onclick = async () => {
    msgEl.style.color = "#6b7280";
    msgEl.textContent = "Probando…";
    try {
      await window.testSupabaseConfig({ url: urlEl.value, anonKey: keyEl.value });
      msgEl.style.color = "#15803d";
      msgEl.textContent = "Conectó bien. Ya puedes guardar.";
    } catch (e) {
      msgEl.style.color = "#b91c1c";
      msgEl.textContent = e.message || String(e);
    }
  };

  document.getElementById("vpSbSave").onclick = async () => {
    msgEl.style.color = "#6b7280";
    msgEl.textContent = "Guardando…";
    try {
      const conf = { url: urlEl.value, anonKey: keyEl.value };
      await window.testSupabaseConfig(conf);
      window.saveSupabaseConfig(conf.url, conf.anonKey);
      location.reload();
    } catch (e) {
      msgEl.style.color = "#b91c1c";
      msgEl.textContent = e.message || String(e);
    }
  };

  document.getElementById("vpSbSql").onclick = async () => {
    try {
      const res = await fetch("/supabase-schema.sql", { cache: "no-store" });
      const sql = await res.text();
      await navigator.clipboard.writeText(sql);
      msgEl.style.color = "#15803d";
      msgEl.textContent = "SQL copiado. Pégalo en SQL Editor de Supabase y dale Run.";
    } catch (_) {
      msgEl.style.color = "#b91c1c";
      msgEl.textContent = "No pude copiar. Abre supabase-schema.sql del repo y cópialo a mano.";
    }
  };
};
