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
window.CLOUD_FETCH_MS = 10000;
window.withCloudTimeout = function (promise, ms) {
  const limit = ms || window.CLOUD_FETCH_MS || 10000;
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
