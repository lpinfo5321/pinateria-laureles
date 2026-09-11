/* ============================================================
   SUPABASE CONFIG
   ------------------------------------------------------------
   Proyecto actual: ookzdtohzhjdlmxgulpa (viva-pinata).
   El proyecto viejo (cmovllgbckjupficttal) quedó APAGADO (522)
   y está bloqueado. Si hace falta, puedes cambiar URL/key desde
   la app: Configuración / Ajustes → Conectar proyecto nuevo.
   ============================================================ */
window.SUPABASE_CONFIG = {
  url:     "https://ookzdtohzhjdlmxgulpa.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9va3pkdG9oemhqZGxteGd1bHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NDIxMDQsImV4cCI6MjEwNDExODEwNH0.VWl2q0mwr8Er-t3nFvzXXFxPpp5ql5HtHD3_RKzHUi4",
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

/* ============================================================
   RESPALDO LOCAL + RECUPERACIÓN
   ------------------------------------------------------------
   La nube nueva (ookzdtohzhjdlmxgulpa) nació vacía. Al reconectar,
   un pull vacío sobreescribía localStorage y se perdían tiendas,
   figuras, pedidos y facturas pendientes. Estas helpers:
   - guardan un catálogo local (tiendas/figuras/precios)
   - unen nube + lo que quede en el aparato
   - suben de nuevo lo local-only (no borramos datos del celular
     solo porque la nube esté vacía)
   ============================================================ */
window.VIVA_ORDERS_KEY = "pinatasOrden_v1";
window.VIVA_CATALOG_KEY = "viva_catalog_v1";
window.VIVA_INVOICES_KEY = "viva_invoices_v1";
window.VIVA_DEVICE_TIENDA_KEY = "viva_device_tienda";

/** Catálogo reconstruido: Laureles + Primavera y figuras típicas del taller.
 *  Los pedidos/facturas del proyecto viejo no estaban en git; esto sí se puede
 *  volver a poner para que la app no quede vacía. */
window.VIVA_BASE_TIENDAS = [
  {id:"t-laureles", nombre:"Laureles", emoji:"🏬", direccion:"", telefono:"", pin:"", activo:true, esDefault:true},
  {id:"t-primavera", nombre:"Primavera", emoji:"🌸", direccion:"", telefono:"", pin:"", activo:true, esDefault:false},
];
window.VIVA_BASE_TEMAS = [
  {id:"t-spiderman",  nombre:"Spiderman",     emoji:"🕸️", activo:true},
  {id:"t-superheroe", nombre:"Superhéroe",    emoji:"🦸",  activo:true},
  {id:"t-batman",     nombre:"Batman",        emoji:"🦇",  activo:true},
  {id:"t-unicornio",  nombre:"Unicornio",     emoji:"🦄",  activo:true},
  {id:"t-princesa",   nombre:"Princesa",      emoji:"👑",  activo:true},
  {id:"t-sirenita",   nombre:"Sirenita",      emoji:"🧜‍♀️", activo:true},
  {id:"t-bluey",      nombre:"Bluey",         emoji:"🐾",  activo:true},
  {id:"t-dinosaurio", nombre:"Dinosaurio",    emoji:"🦖",  activo:true},
  {id:"t-futbol",     nombre:"Fútbol",         emoji:"⚽",  activo:true},
  {id:"t-carros",     nombre:"Carros",        emoji:"🏎️", activo:true},
  {id:"t-mario",      nombre:"Mario Bros",    emoji:"🍄",  activo:true},
  {id:"t-mariposa",   nombre:"Mariposa",      emoji:"🦋",  activo:true},
  {id:"t-espacio",    nombre:"Espacio",       emoji:"🚀",  activo:true},
  {id:"t-arcoiris",   nombre:"Arcoíris",      emoji:"🌈",  activo:true},
  {id:"t-flores",     nombre:"Flores",        emoji:"🌸",  activo:true},
  {id:"t-corazones",  nombre:"Corazones",     emoji:"💖",  activo:true},
  {id:"t-frozen",     nombre:"Frozen",        emoji:"❄️", activo:true},
  {id:"t-mickey",     nombre:"Mickey",        emoji:"🐭",  activo:true},
  {id:"t-minnie",     nombre:"Minnie",        emoji:"🎀",  activo:true},
  {id:"t-hello-kitty",nombre:"Hello Kitty",   emoji:"🐱",  activo:true},
  {id:"t-stitch",     nombre:"Stitch",        emoji:"💙",  activo:true},
  {id:"t-pawpatrol",  nombre:"Paw Patrol",    emoji:"🐶",  activo:true},
  {id:"t-peppa",      nombre:"Peppa Pig",     emoji:"🐷",  activo:true},
  {id:"t-barbie",     nombre:"Barbie",        emoji:"💅",  activo:true},
  {id:"t-encanto",    nombre:"Encanto",       emoji:"🦋",  activo:true},
  {id:"t-moana",      nombre:"Moana",         emoji:"🌊",  activo:true},
  {id:"t-coco",       nombre:"Coco",          emoji:"💀",  activo:true},
  {id:"t-minions",    nombre:"Minions",       emoji:"💛",  activo:true},
  {id:"t-avengers",   nombre:"Avengers",      emoji:"🛡️", activo:true},
  {id:"t-sonic",      nombre:"Sonic",         emoji:"💨",  activo:true},
  {id:"t-pokemon",    nombre:"Pokémon",       emoji:"⚡",  activo:true},
  {id:"t-minecraft",  nombre:"Minecraft",     emoji:"🟩",  activo:true},
  {id:"t-ladybug",    nombre:"Ladybug",       emoji:"🐞",  activo:true},
  {id:"t-dragonball", nombre:"Dragon Ball",   emoji:"🟠",  activo:true},
  {id:"t-toystory",   nombre:"Toy Story",      emoji:"🤠",  activo:true},
  {id:"t-babyshark",  nombre:"Baby Shark",    emoji:"🦈",  activo:true},
  {id:"t-cocomelon",  nombre:"Cocomelon",     emoji:"🍉",  activo:true},
  {id:"t-lol",        nombre:"LOL Surprise", emoji:"💄",  activo:true},
  {id:"t-pony",       nombre:"My Little Pony",emoji:"🐴",  activo:true},
  {id:"t-rapunzel",   nombre:"Rapunzel",      emoji:"💇",  activo:true},
  {id:"t-nona",       nombre:"Número / edad", emoji:"🔢",  activo:true},
];
window.VIVA_BASE_PICOS = [
  {id:"rojo",       nombre:"Rojo",        hex:"#e63946", activo:true},
  {id:"rojoOscuro", nombre:"Rojo vino",   hex:"#9d0208", activo:true},
  {id:"coral",      nombre:"Coral",        hex:"#ff7f50", activo:true},
  {id:"salmon",     nombre:"Salmón",      hex:"#fa8072", activo:true},
  {id:"rosa",       nombre:"Rosa",        hex:"#ff3d8f", activo:true},
  {id:"fucsia",     nombre:"Fucsia",      hex:"#f72585", activo:true},
  {id:"magenta",    nombre:"Magenta",     hex:"#ff00aa", activo:true},
  {id:"pastelRosa", nombre:"Rosa pastel", hex:"#ffafcc", activo:true},
  {id:"naranja",    nombre:"Naranja",     hex:"#ff6b35", activo:true},
  {id:"durazno",    nombre:"Durazno",     hex:"#ffcba4", activo:true},
  {id:"mostaza",    nombre:"Mostaza",     hex:"#e1a400", activo:true},
  {id:"amarillo",   nombre:"Amarillo",    hex:"#ffd60a", activo:true},
  {id:"dorado",     nombre:"Dorado",      hex:"#ffba08", activo:true},
  {id:"crema",      nombre:"Crema",       hex:"#fef3c7", activo:true},
  {id:"lima",       nombre:"Lima",        hex:"#a8ff78", activo:true},
  {id:"menta",      nombre:"Menta",       hex:"#98ff98", activo:true},
  {id:"verde",      nombre:"Verde",       hex:"#52c41a", activo:true},
  {id:"esmeralda",  nombre:"Esmeralda",    hex:"#2d6a4f", activo:true},
  {id:"oliva",      nombre:"Oliva",       hex:"#708238", activo:true},
  {id:"turquesa",   nombre:"Turquesa",    hex:"#2ec4b6", activo:true},
  {id:"cyan",       nombre:"Cyan",        hex:"#5ee7ff", activo:true},
  {id:"celeste",    nombre:"Celeste",     hex:"#87ceeb", activo:true},
  {id:"azul",       nombre:"Azul",        hex:"#3a86ff", activo:true},
  {id:"azulOscuro", nombre:"Azul noche",   hex:"#023e8a", activo:true},
  {id:"morado",     nombre:"Morado",      hex:"#8338ec", activo:true},
  {id:"violeta",    nombre:"Violeta",     hex:"#c77dff", activo:true},
  {id:"lavanda",    nombre:"Lavanda",     hex:"#b5a8e6", activo:true},
  {id:"lila",       nombre:"Lila",        hex:"#cdb4db", activo:true},
  {id:"blanco",     nombre:"Blanco",      hex:"#ffffff", activo:true},
  {id:"champagne",  nombre:"Champagne",   hex:"#f7e7ce", activo:true},
  {id:"beige",      nombre:"Beige",       hex:"#e8d5b7", activo:true},
  {id:"plata",      nombre:"Plateado",    hex:"#c0c0c0", activo:true},
  {id:"gris",       nombre:"Gris",        hex:"#808080", activo:true},
  {id:"chocolate",  nombre:"Chocolate",   hex:"#6b4423", activo:true},
  {id:"marron",     nombre:"Marrón",      hex:"#8b4513", activo:true},
  {id:"negro",      nombre:"Negro",       hex:"#1a1a1a", activo:true},
];
window.VIVA_BASE_TAMBOR = window.VIVA_BASE_PICOS.map(function (c) {
  return { id: "t-" + c.id, nombre: c.nombre, hex: c.hex, activo: true };
});
window.VIVA_BASE_FACTURA = {
  marca: "VIVA PIÑATA",
  subtitulo: "Piñatas hechas a mano",
  cliente: "PINATAS",
  contacto: "",
  piePagina: "Gracias por su preferencia",
  color: "#ec4899",
};

window.readLocalJson = function (key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
};

window.writeLocalJson = function (key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch (_) {
    return false;
  }
};

window.mergeById = function (primary, extra) {
  const map = new Map();
  (primary || []).forEach((x) => {
    if (x && x.id != null) map.set(String(x.id), x);
  });
  (extra || []).forEach((x) => {
    if (!x || x.id == null) return;
    const id = String(x.id);
    if (!map.has(id)) map.set(id, x);
  });
  return Array.from(map.values());
};

window.normalizeTienda = function (t) {
  if (!t) return null;
  const id = t.id || (t.nombre ? "t_" + String(t.nombre).toLowerCase().replace(/\s+/g, "-") : "");
  if (!id) return null;
  return {
    id,
    nombre: String(t.nombre || "Tienda"),
    emoji: String(t.emoji || "🏬"),
    direccion: String(t.direccion || ""),
    telefono: String(t.telefono || ""),
    pin: String(t.pin || ""),
    activo: t.activo !== false,
    esDefault: !!t.esDefault,
  };
};

window.getCachedDeviceTienda = function () {
  return window.normalizeTienda(window.readLocalJson(window.VIVA_DEVICE_TIENDA_KEY, null));
};

window.getLocalOrdersCache = function () {
  const mem = window.readLocalJson(window.VIVA_ORDERS_KEY, null);
  if (!mem) return [];
  if (Array.isArray(mem)) return mem;
  return Array.isArray(mem.ordenes) ? mem.ordenes : [];
};

window.getLocalCatalogCache = function () {
  const raw = window.readLocalJson(window.VIVA_CATALOG_KEY, null);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  return null;
};

window.saveLocalCatalogCache = function (catalog) {
  if (!catalog || typeof catalog !== "object") return;
  window.writeLocalJson(window.VIVA_CATALOG_KEY, {
    picos: catalog.picos || [],
    tambor: catalog.tambor || [],
    temas: catalog.temas || [],
    precios: catalog.precios || {},
    factura: catalog.factura || {},
    tiendas: catalog.tiendas || [],
    savedAt: Date.now(),
  });
};

window.extractCatalogFromColores = function (colores) {
  if (!colores || Array.isArray(colores)) {
    return { picos: [], tambor: [], temas: [], precios: null, factura: null, tiendas: [] };
  }
  return {
    picos: Array.isArray(colores.picos) ? colores.picos : [],
    tambor: Array.isArray(colores.tambor) ? colores.tambor : [],
    temas: Array.isArray(colores.temas) ? colores.temas : [],
    precios: colores.precios || null,
    factura: colores.factura || null,
    tiendas: Array.isArray(colores.tiendas) ? colores.tiendas.map(window.normalizeTienda).filter(Boolean) : [],
  };
};

window.mergeCatalogs = function (cloudColores, localCatalog, deviceTienda) {
  const cloud = window.extractCatalogFromColores(cloudColores);
  const local = localCatalog && typeof localCatalog === "object" ? localCatalog : {};
  const localTiendas = (local.tiendas || []).map(window.normalizeTienda).filter(Boolean);
  let tiendas = window.mergeById(cloud.tiendas, localTiendas);
  const extraStore = window.normalizeTienda(deviceTienda);
  if (extraStore && !tiendas.some((t) => t.id === extraStore.id)) {
    extraStore.esDefault = tiendas.length === 0 ? true : false;
    tiendas.push(extraStore);
  }
  const hasPrimavera = tiendas.some((t) => String(t.id).toLowerCase().includes("primavera") || /primavera/i.test(t.nombre || ""));
  if (tiendas.length <= 1 || !hasPrimavera) {
    const baseStores = (window.VIVA_BASE_TIENDAS || []).map(window.normalizeTienda).filter(Boolean);
    tiendas = window.mergeById(tiendas, baseStores);
  }
  if (tiendas.length && !tiendas.some((t) => t.esDefault && t.activo !== false)) {
    const firstActive = tiendas.find((t) => t.activo !== false) || tiendas[0];
    if (firstActive) firstActive.esDefault = true;
  }

  let temas = window.mergeById(cloud.temas || [], local.temas || []);
  if ((cloud.temas || []).length <= 16) {
    temas = window.mergeById(temas, window.VIVA_BASE_TEMAS || []);
  }
  const picos = ((cloud.picos && cloud.picos.length > 14) ? cloud.picos : window.mergeById(cloud.picos || [], window.VIVA_BASE_PICOS || local.picos || []));
  const tambor = ((cloud.tambor && cloud.tambor.length > 10) ? cloud.tambor : window.mergeById(cloud.tambor || [], window.VIVA_BASE_TAMBOR || []));

  const cloudPrecios = cloud.precios || {};
  const localPrecios = local.precios || {};
  const cloudHasPrice = Number(cloudPrecios.estrella || 0) > 0 || Number(cloudPrecios.personalizada || 0) > 0 || Number(cloudPrecios.libre?.precio || 0) > 0;
  const localHasPrice = Number(localPrecios.estrella || 0) > 0 || Number(localPrecios.personalizada || 0) > 0 || Number(localPrecios.libre?.precio || 0) > 0;
  const precios = cloudHasPrice ? cloudPrecios : (localHasPrice ? localPrecios : (cloud.precios || local.precios || null));

  const cloudFac = cloud.factura || {};
  const localFac = local.factura || {};
  const cloudFacCustom = !!(cloudFac.marca && cloudFac.marca !== "PINATAS") || !!cloudFac.subtitulo || !!cloudFac.contacto;
  const localFacCustom = !!(localFac.marca && localFac.marca !== "PINATAS") || !!localFac.subtitulo || !!localFac.contacto;
  const factura = cloudFacCustom ? cloudFac : (localFacCustom ? localFac : (window.VIVA_BASE_FACTURA || cloud.factura || local.factura || null));

  return {
    picos,
    tambor,
    temas,
    precios: precios || { estrella: 0, personalizada: 0, libre: { nombre: "", precio: 0 } },
    factura: factura || { marca: "PINATAS", subtitulo: "", cliente: "PINATAS", contacto: "", piePagina: "Gracias por su preferencia", color: "#ec4899" },
    tiendas,
  };
};

window.catalogNeedsCloudWrite = function (cloudColores, merged) {
  const cloud = window.extractCatalogFromColores(cloudColores);
  const cloudStores = (cloud.tiendas || []).length;
  const cloudTemas = (cloud.temas || []).length;
  const mergedStores = (merged.tiendas || []).length;
  const mergedTemas = (merged.temas || []).length;
  const cloudPrice = Number(cloud.precios?.estrella || 0) + Number(cloud.precios?.personalizada || 0);
  const mergedPrice = Number(merged.precios?.estrella || 0) + Number(merged.precios?.personalizada || 0);
  return mergedStores > cloudStores || mergedTemas > cloudTemas || mergedPrice > cloudPrice || (merged.picos || []).length > (cloud.picos || []).length;
};

window.cloudUpsertOrders = async function (sb, orders) {
  if (!sb || !orders || !orders.length) return { ok: 0, fail: 0 };
  let ok = 0;
  let fail = 0;
  for (const orden of orders) {
    if (!orden || !orden.id) continue;
    const row = {
      id: orden.id,
      estado: orden.estado || "pendiente",
      pagado: !!orden.pagado,
      data: orden,
    };
    if (orden.numero) row.numero = orden.numero;
    try {
      const { error } = await sb.from("orders").upsert(row);
      if (error) fail += 1;
      else ok += 1;
    } catch (_) {
      fail += 1;
    }
  }
  return { ok, fail };
};

window.cloudUpsertInvoices = async function (sb, invoices) {
  if (!sb || !invoices || !invoices.length) return { ok: 0, fail: 0 };
  let ok = 0;
  let fail = 0;
  for (const inv of invoices) {
    if (!inv || !inv.id) continue;
    const { cliente, items, subtotal, impuesto, total, notas, iva, ordenIds, tienda } = inv;
    const row = {
      id: inv.id,
      estado: inv.estado || "pendiente",
      data: { cliente, items, subtotal, impuesto, total, notas, iva, ordenIds, tienda, pagado: inv.pagado },
    };
    if (inv.numero) row.numero = inv.numero;
    try {
      const { error } = await sb.from("invoices").upsert(row);
      if (error) fail += 1;
      else ok += 1;
    } catch (_) {
      fail += 1;
    }
  }
  return { ok, fail };
};

window.cloudUpsertCatalog = async function (sb, catalog) {
  if (!sb || !catalog) return false;
  const payload = {
    id: "default",
    colores: {
      picos: catalog.picos || [],
      tambor: catalog.tambor || [],
      temas: catalog.temas || [],
      precios: catalog.precios || {},
      factura: catalog.factura || {},
      tiendas: catalog.tiendas || [],
    },
    colores_picos: catalog.picos || [],
    colores_tambor: catalog.tambor || [],
  };
  try {
    const { error } = await sb.from("app_config").upsert(payload);
    return !error;
  } catch (_) {
    return false;
  }
};

window.buildFullBackup = function (extra) {
  extra = extra || {};
  const ordersMem = window.readLocalJson(window.VIVA_ORDERS_KEY, { config: {}, ordenes: [], lastOrderNum: 0 });
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "viva-pinata",
    catalog: extra.catalog || window.getLocalCatalogCache(),
    orders: extra.orders || (Array.isArray(ordersMem.ordenes) ? ordersMem.ordenes : []),
    invoices: extra.invoices || window.readLocalJson(window.VIVA_INVOICES_KEY, []),
    deviceTienda: window.getCachedDeviceTienda(),
    config: extra.config || ordersMem.config || null,
  };
};

window.downloadVivaBackup = function (extra) {
  const backup = window.buildFullBackup(extra);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  const day = new Date().toISOString().slice(0, 10);
  a.href = URL.createObjectURL(blob);
  a.download = "viva-pinata-respaldo-" + day + ".json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 800);
  return backup;
};

window.applyImportedBackupLocally = function (backup) {
  if (!backup || typeof backup !== "object") throw new Error("Archivo inválido");
  const orders = backup.orders || backup.ordenes || [];
  const catalog = backup.catalog || null;
  const invoices = backup.invoices || [];
  const device = backup.deviceTienda || backup.device_tienda;
  const prev = window.readLocalJson(window.VIVA_ORDERS_KEY, { config: {}, ordenes: [], lastOrderNum: 0 });
  const mergedOrders = window.mergeById(orders, prev.ordenes || []);
  const lastOrderNum = mergedOrders.reduce((m, o) => Math.max(m, Number(o.numero) || 0), Number(prev.lastOrderNum) || 0);
  window.writeLocalJson(window.VIVA_ORDERS_KEY, {
    config: backup.config || prev.config || {},
    ordenes: mergedOrders,
    lastOrderNum,
  });
  if (catalog) {
    const mergedCat = window.mergeCatalogs(catalog, window.getLocalCatalogCache(), device);
    window.saveLocalCatalogCache(mergedCat);
  } else if (device) {
    window.saveLocalCatalogCache(window.mergeCatalogs({}, window.getLocalCatalogCache(), device));
  }
  if (invoices.length) {
    const prevInv = window.readLocalJson(window.VIVA_INVOICES_KEY, []);
    window.writeLocalJson(window.VIVA_INVOICES_KEY, window.mergeById(invoices, prevInv));
  }
  if (device && device.id) {
    window.writeLocalJson(window.VIVA_DEVICE_TIENDA_KEY, device);
  }
  return {
    orders: mergedOrders.length,
    invoices: (invoices || []).length,
    tiendas: (catalog && catalog.tiendas && catalog.tiendas.length) || 0,
    temas: (catalog && catalog.temas && catalog.temas.length) || 0,
  };
};

window.showRecoveryToast = function (msg) {
  if (!msg) return;
  if (typeof window.showToast === "function") {
    window.showToast(msg);
    return;
  }
  const id = "vpRecoveryToast";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483646;background:#111827;color:#fff;padding:12px 16px;border-radius:14px;font:700 13px/1.35 'Plus Jakarta Sans',system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.28);max-width:min(92vw,420px);text-align:center";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  clearTimeout(window._vpRecoveryToastTimer);
  window._vpRecoveryToastTimer = setTimeout(() => { el.style.opacity = "0"; }, 4200);
};

