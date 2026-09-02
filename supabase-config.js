/* ============================================================
   SUPABASE CONFIG
   ------------------------------------------------------------
   Pega aquí tus credenciales de Supabase.
   Si dejas los valores vacíos la app seguirá funcionando solo
   con almacenamiento local (sin sincronización en vivo).

   Cómo conseguirlos:
   1. Crea una cuenta gratis en https://supabase.com
   2. Crea un proyecto nuevo (región más cercana: South America / us-east)
   3. Ve a Settings → API
   4. Copia "Project URL" y "anon public" key
   5. Pégalos abajo
   6. Ve a SQL Editor y corre el archivo supabase-schema.sql
   ============================================================ */
window.SUPABASE_CONFIG = {
  url:     "https://cmovllgbckjupficttal.supabase.co",
  anonKey: "sb_publishable_-9ejqS4waywUzvKri27ZsQ_MMIRNlLS",
};

// Evita que la UI se quede esperando si el origen de Supabase no responde (p.ej. 522).
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

window.hideCloudDownBanner = function () {
  const bar = document.getElementById("vpCloudDown");
  if (!bar) return;
  bar.remove();
  document.documentElement.style.removeProperty("--vp-cloud-down-pad");
  document.body && (document.body.style.paddingTop = "");
};

window.showCloudDownBanner = function () {
  if (document.getElementById("vpCloudDown")) return;
  const bar = document.createElement("div");
  bar.id = "vpCloudDown";
  bar.setAttribute("role", "status");
  bar.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "right:0",
    "z-index:2147483646",
    "background:#7f1d1d",
    "color:#fff",
    "padding:10px 14px",
    "font:700 13px/1.4 'Plus Jakarta Sans',system-ui,sans-serif",
    "text-align:center",
    "box-shadow:0 8px 24px rgba(0,0,0,.22)",
  ].join(";");
  bar.innerHTML = 'La nube (Supabase) no responde desde hace rato. Esta pantalla ya no espera: puedes usar la app en este aparato. Los pedidos no se sincronizan. <button type="button" id="vpCloudDownRetry" style="margin:6px 0 0 8px;border:0;border-radius:999px;padding:6px 12px;background:#fff;color:#7f1d1d;font-weight:800;cursor:pointer">Reintentar</button>';
  const mount = () => {
    if (!document.body) return false;
    document.body.prepend(bar);
    document.body.style.paddingTop = "52px";
    const btn = document.getElementById("vpCloudDownRetry");
    if (btn) btn.onclick = () => location.reload();
    return true;
  };
  if (!mount()) {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  }
};
