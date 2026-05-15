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
| **Dominio personalizado** | `https://ordervivapinata.com` *(en configuración)* |
| **GitHub repo** | `https://github.com/lpinfo5321/pinateria-laureles` (rama `main`) |
| **URL antigua (puede seguir activa como redirect)** | `https://pinateria-laureles.vercel.app` |

> **Nota sobre la ñ en el dominio:** Los subdominios `.vercel.app` no aceptan la letra ñ ni acentos por restricciones del DNS estándar. El dominio personalizado `.com` sí podría usar ñ pero el usuario optó por `ordervivapinata.com` (sin ñ) para evitar problemas de búsqueda y compartido.

---

## Vercel

- **Nombre del proyecto en Vercel:** `ordervivapinata`
- **Project ID:** `prj_05VrzZtzdjaKWpvKhT4Xn5fX3FjE`
- **Equipo/Org:** `c35c228c` (visible en la URL del dashboard)
- **Despliegue:** Auto desde GitHub `main` branch

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
