# PROJECT INFO · Viva Piñata

**Lee este archivo PRIMERO antes de actualizar cualquier cosa de la app.**
Aquí está la info crítica del proyecto (URLs, repos, servicios, credenciales no sensibles).

---

## App general

- **Nombre comercial:** Viva Piñata (con ñ)
- **Tipo:** Web app + PWA instalable
- **Lenguaje:** HTML/CSS/JavaScript vanilla (sin framework)
- **Uso:** Toma de órdenes de piñatas para múltiples tiendas/sucursales

---

## URLs y dominios

| Lugar | URL |
|---|---|
| **Producción Vercel** | `https://ordervivapinata.vercel.app` |
| **Dominio personalizado** | `https://ordervivapinata.com` *(DNS NXDOMAIN — no resuelve; no usar hasta reconfigurar)* |
| **GitHub repo** | `https://github.com/lpinfo5321/pinateria-laureles` (rama `main`) |
| **URL antigua** | `https://pinateria-laureles.vercel.app` *(404 DEPLOYMENT_NOT_FOUND)* |

> **Nota sobre la ñ en el dominio:** Los subdominios `.vercel.app` no aceptan la letra ñ ni acentos por restricciones del DNS estándar. El dominio personalizado `.com` sí podría usar ñ pero el usuario optó por `ordervivapinata.com` (sin ñ) para evitar problemas de búsqueda y compartido.

---

## Vercel

- **Nombre del proyecto en Vercel:** `ordervivapinata`
- **Project ID:** `prj_05VrzZtzdjaKWpvKhT4Xn5fX3FjE`
- **Equipo/Org:** `c35c228c` (visible en la URL del dashboard)
- **Despliegue:** Auto desde GitHub `main` branch
- **Restore / Instant Rollback:** en Hobby solo guarda deploys ~30 días. Un deploy de mayo no se puede “Restore”. Para volver a publicar hay que **Redeploy** o hacer `git push` a `main`, no restaurar un deployment viejo.

### Si la app “no arranca” y Vercel no la restablece

1. El frontend en `ordervivapinata.vercel.app` puede estar bien (HTML/CSS/JS estáticos).
2. Los pedidos, tiendas y facturas viven en **Supabase**, no en Vercel. Si el proyecto está pausado o el origen responde **522**, Restore de Vercel no recupera datos.
3. Entra a [supabase.com](https://supabase.com) → proyecto `cmovllgbckjupficttal` → **Restore / Unpause**.
4. Si Restore lleva **más de 1 hora** en spinner (o 522 persistente), **ya no va a terminar solo**. Abre ticket en https://supabase.com/dashboard/support/new con el Project Ref `cmovllgbckjupficttal` y pide que desbloqueen un restore atascado (COMING_UP / PAUSING).
5. Si Restore lleva horas o días: **crea un proyecto nuevo** (el viejo no se puede encender desde la app). En la app: Configuración / Ajustes → **Conectar proyecto nuevo**, pega URL + anon key, y corre `supabase-schema.sql` en el SQL Editor. Eso recupera la sync; los pedidos del proyecto viejo solo los saca el soporte de Supabase.
6. Usa `https://ordervivapinata.vercel.app` hasta que el dominio `.com` tenga DNS otra vez.

---

## Supabase (base de datos en la nube)

- **URL:** `https://cmovllgbckjupficttal.supabase.co`
- **Tablas principales:**
  - `orders` — órdenes de piñatas
  - `app_config` — config global (PIN admin, WhatsApp, **colores/tiendas/figuras/precios/factura** todo en columna `colores` JSONB)
  - `invoices` — facturas que el taller emite a Laureles
- **Realtime:** habilitado en las 3 tablas via `supabase_realtime` publication
- **Anon key:** está en `supabase-config.js` (público, OK)

---

## Estructura de archivos

| Archivo | Propósito |
|---|---|
| `index.html` + `script.js` + `styles.css` | App principal de **clientes/tiendas** para crear órdenes |
| `taller.html` | App del **taller** (PWA instalable) para producción + ajustes |
| `facturas.html` | App de **facturas** (solo accesible desde taller) |
| `upload.html` | Página móvil para subir imágenes vía QR |
| `manifest.webmanifest` | Manifest PWA (apunta a /taller) |
| `service-worker.js` | SW de cache + notificaciones (versión `CACHE_VERSION`) |
| `vercel.json` | Rewrites y headers de cache |
| `supabase-schema.sql` | Schema completo de Supabase |

---

## Modelo de datos clave

### Tiendas (en `app_config.colores.tiendas`)
Array de `{id, nombre, emoji, direccion, telefono, pin, activo, esDefault}`. Al menos una debe ser default.
- `pin`: PIN opcional. Si está, se pide al elegir esta tienda en un dispositivo nuevo.
- Los PIN de tiendas se configuran SOLO en `taller.html` → Ajustes → Tiendas.
- La app principal (`index.html`) no debe mostrar ni guardar un PIN global de tienda para evitar mezclar tiendas.

### Master PIN
**`1020`** funciona como llave maestra en TODA la app:
- Cualquier tienda con PIN se abre con `1020`
- El panel admin del index se abre con `1020` (además del PIN configurado en ajustes)
- Las facturas (`/facturas`) se abren con `1020`
- Está definido como `MASTER_PIN` en `script.js` y `facturas.html`

### Device tienda (en localStorage del navegador, NO en nube)
Clave: `viva_device_tienda` · valor: `{id, nombre, emoji, direccion, telefono}`.
Se pregunta al primer uso de la app en cada dispositivo. Cada dispositivo recuerda en qué tienda está.

### Orden
Lleva `tienda: {id, nombre, emoji, direccion, telefono}` (la tienda donde se recoge).

### Factura
Lleva `tienda: {...}` (la tienda destinataria). Filtros de la lista pueden separarlas por tienda.

---

## Comandos comunes

```bash
# Subir cambios (auto-despliega en Vercel)
git add -A
git commit -m "mensaje"
git push

# Forzar refresh de cache en clientes
# → bump CACHE_VERSION en service-worker.js
```

---

## Versión cache actual

Ver `service-worker.js` línea `const CACHE_VERSION = ...`. Cada cambio importante incrementa este valor.

---

## Cuando el usuario diga "no se actualizó la app"

1. Bump `CACHE_VERSION` en `service-worker.js`
2. `git push`
3. Pedirle al usuario que cierre y reabra la PWA (o haga hard refresh en navegador)
