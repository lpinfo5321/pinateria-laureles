# 🪅 Piñatería Laureles · App de Órdenes

App web para tomar y gestionar órdenes de piñatas. Funciona en tiempo real:
cualquier cambio en una computadora o celular se ve al instante en los demás
dispositivos sin recargar la página.

---

## 🚀 Puesta en marcha (una sola vez, ~5 minutos)

### 1. Crear la base de datos en Supabase (GRATIS)

1. Entra a **https://supabase.com** y crea una cuenta (puedes usar tu GitHub).
2. Dale a **New project**:
   - Name: `pinateria-laureles` (lo que quieras)
   - Database password: genera una fuerte y **guárdala**
   - Region: la más cercana (ej. `South America - São Paulo` o `East US`)
3. Espera ~1 min a que se cree.
4. Ve a **SQL Editor** (ícono del menú lateral) → **New query**.
5. Abre el archivo `supabase-schema.sql` de este proyecto, **copia todo su contenido** y pégalo en el editor.
6. Dale **Run**. Deberías ver "Success. No rows returned".
7. Ve a **Settings (⚙️) → API** y copia:
   - **Project URL** (algo como `https://abcde12345.supabase.co`)
   - **anon public** key (una cadena larga que empieza con `eyJ…`)
8. Abre el archivo `supabase-config.js` y pega los dos valores:

```js
window.SUPABASE_CONFIG = {
  url:     "https://abcde12345.supabase.co",
  anonKey: "eyJhbGciOi...tu-llave-completa",
};
```

> **Importante:** la `anon key` es pública (va en el navegador). No pegues la
> `service_role` key nunca.

### 2. Subir a GitHub + Vercel

Ya está todo preparado. Solo sigue las instrucciones que te daré en el chat,
o si prefieres hacerlo a mano:

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create pinateria-laureles --public --source=. --push
```

Luego entra a **https://vercel.com** → **Add New Project** → importa el repo
desde GitHub → **Deploy**. Sin configurar nada más. Listo.

---

## ✅ Cómo saber que todo funciona

1. Abre la app desplegada.
2. Mira el **puntito** arriba a la izquierda junto a "Piñatería Laureles":
   - 🟢 **Verde-azul**: conectado a la nube (realtime activo)
   - 🔴 **Rosa clásico**: solo modo local
3. Abre la app en **dos navegadores** (o tu PC + tu celular).
4. Crea una orden en uno → aparece en el otro al instante sin recargar.

---

## 🧩 Estructura

```
.
├── index.html              ← HTML de la app
├── styles.css              ← Estilos (diseño moderno light)
├── script.js               ← Lógica + integración Supabase
├── supabase-config.js      ← Tus credenciales (pégalas aquí)
├── supabase-schema.sql     ← Crea las tablas (córrelo una vez)
├── vercel.json             ← Config de despliegue
└── README.md               ← Este archivo
```

---

## 🔐 Seguridad (nivel actual)

- La `anon key` va en el navegador (es pública por diseño).
- Las políticas de Row Level Security permiten lectura/escritura pública
  (porque es una app interna del negocio; tú y tu personal son los únicos que
  acceden a la URL).
- El **PIN del admin** (configurable desde Configuración) es la capa de
  protección: sin el PIN no se puede entrar al panel.

Si más adelante quieres blindarla con login real (email/password, magic link,
Google, etc.), avísame y lo activamos.

---

## 🛠️ Desarrollo local

Es un sitio estático puro. Puedes abrirlo con cualquier servidor, por ejemplo:

```bash
# Con npx (requiere Node)
npx serve .

# O con Python
python -m http.server 8000
```

Luego entra a `http://localhost:8000`.
