/* ============================================================
   Orden de Piñata · Laureles
   Lógica de flujo por pasos, calendario, uploader y WhatsApp
   ============================================================ */

/* ============================================================
   CONFIGURACIÓN (los valores editables por el admin viven en
   localStorage. Aquí solo defaults del flujo)
   ============================================================ */
const CONFIG = {
  minDaysAhead: 1,
  maxDaysAhead: 120,
};

/* ============================================================
   Estado global
   ============================================================ */
const state = {
  step: "welcome",
  history: [],
  tipo: null, // 'estrella' | 'personalizada'
  estrella: {
    colores: [], // array de objetos {id, nombre, hex}
    tematica: "",
    emoji: "🪅",
    notas: "",
  },
  personalizada: {
    imagen: null, // dataURL
    imagenNombre: "",
    descripcion: "",
  },
  fecha: null, // Date
  contacto: {
    nombre: "",
    telefono: "",
    atendidoPor: "",
    pagado: false,
  },
};

/* ============================================================
   Colores disponibles (el usuario elige la cantidad que quiera)
   ============================================================ */
const COLORES_BASE = [
  // Rojos / rosas
  { id: "rojo",       nombre: "Rojo",        hex: "#e63946" },
  { id: "rojoOscuro", nombre: "Rojo vino",   hex: "#9d0208" },
  { id: "coral",      nombre: "Coral",       hex: "#ff7f50" },
  { id: "salmon",     nombre: "Salmón",      hex: "#fa8072" },
  { id: "rosa",       nombre: "Rosa",        hex: "#ff3d8f" },
  { id: "fucsia",     nombre: "Fucsia",      hex: "#f72585" },
  { id: "magenta",    nombre: "Magenta",     hex: "#ff00aa" },
  { id: "pastelRosa", nombre: "Rosa pastel", hex: "#ffafcc" },
  // Naranjas / amarillos
  { id: "naranja",    nombre: "Naranja",     hex: "#ff6b35" },
  { id: "durazno",    nombre: "Durazno",     hex: "#ffcba4" },
  { id: "mostaza",    nombre: "Mostaza",     hex: "#e1a400" },
  { id: "amarillo",   nombre: "Amarillo",    hex: "#ffd60a" },
  { id: "dorado",     nombre: "Dorado",      hex: "#ffba08" },
  { id: "crema",      nombre: "Crema",       hex: "#fef3c7" },
  // Verdes
  { id: "lima",       nombre: "Lima",        hex: "#a8ff78" },
  { id: "menta",      nombre: "Menta",       hex: "#98ff98" },
  { id: "verde",      nombre: "Verde",       hex: "#52c41a" },
  { id: "esmeralda",  nombre: "Esmeralda",   hex: "#2d6a4f" },
  { id: "oliva",      nombre: "Oliva",       hex: "#708238" },
  // Azules / cyans
  { id: "turquesa",   nombre: "Turquesa",    hex: "#2ec4b6" },
  { id: "cyan",       nombre: "Cyan",        hex: "#5ee7ff" },
  { id: "celeste",    nombre: "Celeste",     hex: "#87ceeb" },
  { id: "azul",       nombre: "Azul",        hex: "#3a86ff" },
  { id: "azulOscuro", nombre: "Azul noche",  hex: "#023e8a" },
  // Morados / lilas
  { id: "morado",     nombre: "Morado",      hex: "#8338ec" },
  { id: "violeta",    nombre: "Violeta",     hex: "#c77dff" },
  { id: "lavanda",    nombre: "Lavanda",     hex: "#b5a8e6" },
  { id: "lila",       nombre: "Lila",        hex: "#cdb4db" },
  // Neutros / metales
  { id: "blanco",     nombre: "Blanco",      hex: "#ffffff" },
  { id: "champagne",  nombre: "Champagne",   hex: "#f7e7ce" },
  { id: "beige",      nombre: "Beige",       hex: "#e8d5b7" },
  { id: "plata",      nombre: "Plateado",    hex: "#c0c0c0" },
  { id: "gris",       nombre: "Gris",        hex: "#808080" },
  { id: "chocolate",  nombre: "Chocolate",   hex: "#6b4423" },
  { id: "marron",     nombre: "Marrón",      hex: "#8b4513" },
  { id: "negro",      nombre: "Negro",       hex: "#1a1a1a" },
];

// Lista mutable: empieza con los base y se agregan custom
let COLORES = [...COLORES_BASE];
const MAX_COLORES = 8; // un poco más flexible

/* ============================================================
   Orden de pantallas (usado para la barra de progreso)
   ============================================================ */
const SCREEN_ORDER = ["welcome", "type", "estrella|personalizada", "fecha", "contacto"];

/* ============================================================
   Utilidades DOM
   ============================================================ */
const $ = (sel, parent = document) => parent.querySelector(sel);
const $$ = (sel, parent = document) => Array.from(parent.querySelectorAll(sel));

function byScreen(name) {
  return document.querySelector(`.screen[data-screen="${name}"]`);
}

/* ============================================================
   Navegación de pantallas
   ============================================================ */
function goTo(screenName, { pushHistory = true } = {}) {
  const current = $(".screen.is-active");
  const next = byScreen(screenName);
  if (!next || next === current) return;

  if (pushHistory && current) {
    state.history.push(current.dataset.screen);
  }

  if (current) {
    current.classList.add("is-leaving");
    current.classList.remove("is-active");
    setTimeout(() => current.classList.remove("is-leaving"), 320);
  }

  next.classList.add("is-active");
  state.step = screenName;

  window.scrollTo({ top: 0, behavior: "smooth" });

  updateProgress();
  updateBackButton();

  // Inicializadores por pantalla
  if (screenName === "fecha") initCalendar();
  if (screenName === "contacto") renderSummary();
  if (screenName === "estrella") startColorCycle();
  else stopColorCycle();
  if (screenName === "admin") renderAdmin();
}

function goBack() {
  if (state.history.length === 0) return;
  const previous = state.history.pop();
  goTo(previous, { pushHistory: false });
}

function updateProgress() {
  const fill = $("#progressFill");
  const progress = $("#progress");
  // Ocultar barra en admin
  if (state.step === "admin") {
    progress.style.opacity = "0";
    return;
  }
  progress.style.opacity = "1";
  let idx = 0;
  for (let i = 0; i < SCREEN_ORDER.length; i++) {
    const key = SCREEN_ORDER[i];
    if (key.includes("|")) {
      if (key.split("|").includes(state.step)) {
        idx = i;
        break;
      }
    } else if (key === state.step) {
      idx = i;
      break;
    }
  }
  const pct = state.step === "exito" ? 100 : (idx / (SCREEN_ORDER.length - 1)) * 100;
  fill.style.width = `${pct}%`;
}

function updateBackButton() {
  const btn = $("#btnBack");
  if (state.history.length > 0 && state.step !== "exito") {
    btn.classList.add("is-visible");
  } else {
    btn.classList.remove("is-visible");
  }
}

/* ============================================================
   Pantalla bienvenida
   ============================================================ */
$("#btnStart").addEventListener("click", () => goTo("type"));
$("#btnBack").addEventListener("click", goBack);

/* ============================================================
   Pantalla de tipo
   ============================================================ */
$$(".type-card").forEach(card => {
  card.addEventListener("click", () => {
    state.tipo = card.dataset.type;
    if (state.tipo === "estrella") {
      goTo("estrella");
    } else {
      goTo("personalizada");
    }
  });
});

/* ============================================================
   Pantalla Estrella (6 picos)
   ============================================================ */
function renderColorSwatches() {
  const grid = $("#colorsGrid");
  grid.innerHTML = "";
  COLORES.forEach(c => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "color-swatch";
    btn.dataset.id = c.id;
    btn.style.setProperty("--c", c.hex);
    btn.setAttribute("aria-label", c.nombre);
    btn.title = c.nombre;
    btn.addEventListener("click", () => toggleColor(c));
    grid.appendChild(btn);
  });
  updateColorsUI();
}

function toggleColor(color) {
  const idx = state.estrella.colores.findIndex(x => x.id === color.id);
  if (idx >= 0) {
    state.estrella.colores.splice(idx, 1);
  } else {
    if (state.estrella.colores.length >= MAX_COLORES) {
      showToast(`Máximo ${MAX_COLORES} colores.`);
      return;
    }
    state.estrella.colores.push(color);
  }
  updateColorsUI();
  startColorCycle();
}

/* Color picker personalizado */
function addCustomColor(hex) {
  const cleanHex = hex.toLowerCase();
  // ¿Ya existe?
  const existing = COLORES.find(c => c.hex.toLowerCase() === cleanHex);
  if (existing) {
    // Solo seleccionarlo si no está ya
    if (!state.estrella.colores.find(x => x.id === existing.id)) {
      toggleColor(existing);
    } else {
      showToast("Ese color ya está seleccionado.");
    }
    return;
  }
  const newColor = {
    id: "custom_" + Date.now(),
    nombre: "Personalizado",
    hex: cleanHex,
    isCustom: true,
  };
  COLORES.push(newColor);
  renderColorSwatches();
  // Seleccionar automáticamente
  if (state.estrella.colores.length < MAX_COLORES) {
    state.estrella.colores.push(newColor);
  }
  updateColorsUI();
  startColorCycle();
}

function updateColorsUI() {
  const grid = $("#colorsGrid");
  const counter = $("#colorsCounter");
  const n = state.estrella.colores.length;

  counter.textContent = `${n} de ${MAX_COLORES}`;
  counter.classList.toggle("is-full", n === MAX_COLORES);

  $$(".color-swatch", grid).forEach(btn => {
    const idx = state.estrella.colores.findIndex(x => x.id === btn.dataset.id);
    const oldBadge = btn.querySelector(".color-swatch__badge");
    if (oldBadge) oldBadge.remove();
    if (idx >= 0) {
      btn.classList.add("is-active");
      const badge = document.createElement("span");
      badge.className = "color-swatch__badge";
      badge.textContent = idx + 1;
      btn.appendChild(badge);
    } else {
      btn.classList.remove("is-active");
    }
  });
}

/* Ciclo animado: los colores rotan por los 6 picos cada intervalo */
let colorCycleTimer = null;
let colorCycleOffset = 0;

function applyColorsToSvg(offset = 0) {
  const colores = state.estrella.colores;
  if (colores.length === 0) {
    for (let i = 0; i < 6; i++) {
      const pico = $(`#p${i}`);
      if (pico) pico.setAttribute("fill", "rgba(255,255,255,0.15)");
    }
    $("#starBody").setAttribute("fill", "rgba(255,255,255,0.15)");
    $("#starCenter").setAttribute("fill", "rgba(255,255,255,0.1)");
    return;
  }
  // Distribuir rotando con el offset actual
  for (let i = 0; i < 6; i++) {
    const c = colores[(i + offset) % colores.length];
    const pico = $(`#p${i}`);
    if (pico) pico.setAttribute("fill", c.hex);
  }
  // Cuerpo y centro también ciclan
  $("#starBody").setAttribute("fill", colores[offset % colores.length].hex);
  $("#starCenter").setAttribute("fill", colores[(offset + 1) % colores.length].hex);
}

function startColorCycle() {
  stopColorCycle();
  colorCycleOffset = 0;
  applyColorsToSvg(0);
  // Solo animar si hay 2+ colores y la pantalla activa es 'estrella'
  if (state.estrella.colores.length < 2) return;
  if (state.step !== "estrella") return;
  colorCycleTimer = setInterval(() => {
    colorCycleOffset = (colorCycleOffset + 1) % state.estrella.colores.length;
    applyColorsToSvg(colorCycleOffset);
  }, 1800);
}

function stopColorCycle() {
  if (colorCycleTimer) {
    clearInterval(colorCycleTimer);
    colorCycleTimer = null;
  }
}

/* Temática / personaje */
$$(".chip-sugg[data-theme]").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".chip-sugg[data-theme]").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    state.estrella.tematica = btn.dataset.theme;
    state.estrella.emoji = btn.dataset.emoji;
    $("#tematica").value = btn.dataset.theme;
    $("#starEmoji").textContent = btn.dataset.emoji;
    $("#starLabel").textContent = btn.dataset.theme;
  });
});

$("#tematica").addEventListener("input", (e) => {
  state.estrella.tematica = e.target.value.trim();
  $$(".chip-sugg[data-theme]").forEach(b => b.classList.remove("is-active"));
  $("#starLabel").textContent = state.estrella.tematica || "Tu piñata estrella";
});

$("#estrellaNotas").addEventListener("input", (e) => {
  state.estrella.notas = e.target.value.trim();
});

/* ============================================================
   Pantalla Personalizada (uploader)
   ============================================================ */
const imgInput = $("#imgInput");
const previewImg = $("#previewImg");
const uploaderPlaceholder = $("#uploaderPlaceholder");
const uploaderPreview = $("#uploaderPreview");

imgInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) {
    showToast("La imagen no puede superar los 15MB.");
    imgInput.value = "";
    return;
  }
  showToast("Procesando imagen...");
  try {
    const dataURL = await resizeImage(file, 1200, 0.85);
    state.personalizada.imagen = dataURL;
    state.personalizada.imagenNombre = file.name;
    previewImg.src = dataURL;
    uploaderPlaceholder.hidden = true;
    uploaderPreview.hidden = false;
  } catch (err) {
    showToast("No se pudo procesar la imagen.");
    console.error(err);
  }
});

$("#removeImg").addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.personalizada.imagen = null;
  state.personalizada.imagenNombre = "";
  previewImg.src = "";
  imgInput.value = "";
  uploaderPlaceholder.hidden = false;
  uploaderPreview.hidden = true;
});

$("#descripcion").addEventListener("input", (e) => {
  state.personalizada.descripcion = e.target.value.trim();
});

$$("#quickTags .chip-sugg").forEach(btn => {
  btn.addEventListener("click", () => {
    const textarea = $("#descripcion");
    const toAdd = btn.dataset.add;
    const curr = textarea.value.trim();
    textarea.value = curr ? `${curr} ${toAdd}` : toAdd;
    state.personalizada.descripcion = textarea.value.trim();
    btn.classList.add("is-active");
    textarea.focus();
    setTimeout(() => btn.classList.remove("is-active"), 600);
  });
});

/* ============================================================
   Botones "Continuar" por pantalla
   ============================================================ */
$$(".btn-next").forEach(btn => {
  btn.addEventListener("click", () => {
    const screen = btn.closest(".screen").dataset.screen;
    if (!validateScreen(screen)) return;
    if (screen === "estrella" || screen === "personalizada") goTo("fecha");
    else if (screen === "fecha") goTo("contacto");
  });
});

function validateScreen(screen) {
  if (screen === "estrella") {
    if (state.estrella.colores.length === 0) {
      showToast("Elige al menos 1 color.");
      return false;
    }
    if (!state.estrella.tematica) {
      showToast("Por favor elige o escribe una temática.");
      $("#tematica").focus();
      return false;
    }
    return true;
  }
  if (screen === "personalizada") {
    if (!state.personalizada.imagen) {
      showToast("Por favor sube una imagen de referencia.");
      return false;
    }
    if (!state.personalizada.descripcion) {
      showToast("Agrega una descripción de lo que quieres.");
      $("#descripcion").focus();
      return false;
    }
    return true;
  }
  if (screen === "fecha") {
    if (!state.fecha) {
      showToast("Elige una fecha para recoger.");
      return false;
    }
    return true;
  }
  return true;
}

/* ============================================================
   Calendario custom
   ============================================================ */
const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const WEEKDAYS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

let calCursor = new Date();
calCursor.setDate(1);

function initCalendar() {
  renderCalendar();
  updateSelectedDate();
  const nextBtn = byScreen("fecha").querySelector(".btn-next");
  if (nextBtn) nextBtn.disabled = !state.fecha;
  $("#calPrev").onclick = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const prev = new Date(calCursor);
    prev.setMonth(prev.getMonth() - 1);
    if (prev >= firstOfThisMonth) {
      calCursor = prev;
      renderCalendar();
    }
  };
  $("#calNext").onclick = () => {
    calCursor.setMonth(calCursor.getMonth() + 1);
    renderCalendar();
  };
}

function renderCalendar() {
  const year = calCursor.getFullYear();
  const month = calCursor.getMonth();
  $("#calTitle").textContent = `${MONTHS_ES[month]} ${year}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + CONFIG.minDaysAhead);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + CONFIG.maxDaysAhead);

  // Deshabilitar nav previa si estamos en el mes actual
  const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const cursorMonthStart = new Date(year, month, 1);
  $("#calPrev").disabled = cursorMonthStart <= firstOfThisMonth;

  const first = new Date(year, month, 1);
  // Lunes como primer día (0=Dom → mapear a 6)
  let startDow = first.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysEl = $("#calDays");
  daysEl.innerHTML = "";

  // Días vacíos
  for (let i = 0; i < startDow; i++) {
    const empty = document.createElement("button");
    empty.className = "cal-day is-empty";
    empty.disabled = true;
    empty.setAttribute("aria-hidden", "true");
    daysEl.appendChild(empty);
  }

  // Días del mes
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const btn = document.createElement("button");
    btn.className = "cal-day";
    btn.textContent = d;
    btn.type = "button";

    const isBeforeMin = date < minDate;
    const isAfterMax = date > maxDate;
    if (isBeforeMin || isAfterMax) {
      btn.disabled = true;
    }
    if (sameDay(date, today)) btn.classList.add("is-today");
    if (state.fecha && sameDay(date, state.fecha)) btn.classList.add("is-selected");

    btn.addEventListener("click", () => {
      state.fecha = date;
      renderCalendar();
      updateSelectedDate();
      const nextBtn = byScreen("fecha").querySelector(".btn-next");
      nextBtn.disabled = false;
    });

    daysEl.appendChild(btn);
  }
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

function updateSelectedDate() {
  const box = $("#selectedDate");
  const text = $("#selectedDateText");
  if (state.fecha) {
    const d = state.fecha;
    const weekday = WEEKDAYS_ES[d.getDay()];
    text.textContent = `${weekday} ${d.getDate()} de ${MONTHS_ES[d.getMonth()].toLowerCase()}, ${d.getFullYear()}`;
    box.hidden = false;
  } else {
    box.hidden = true;
  }
}

/* ============================================================
   Pantalla Contacto / Resumen
   ============================================================ */
$("#nombre").addEventListener("input", (e) => {
  state.contacto.nombre = e.target.value.trim();
});
$("#telefono").addEventListener("input", (e) => {
  state.contacto.telefono = e.target.value.trim();
});
$("#atendidoPor").addEventListener("input", (e) => {
  state.contacto.atendidoPor = e.target.value.trim();
});

// Toggle pago
$("#payNo").addEventListener("click", () => {
  state.contacto.pagado = false;
  $("#payNo").classList.add("is-active");
  $("#payYes").classList.remove("is-active");
});
$("#payYes").addEventListener("click", () => {
  state.contacto.pagado = true;
  $("#payYes").classList.add("is-active");
  $("#payNo").classList.remove("is-active");
});

function renderSummary() {
  const list = $("#summaryList");
  list.innerHTML = "";

  const rows = [];

  if (state.tipo === "estrella") {
    rows.push({ label: "Tipo", value: "Piñata estrella (6 picos)" });
    const dotsHTML = state.estrella.colores
      .map(c => `<span class="summary-dot" style="background:${c.hex}"></span>`)
      .join("");
    rows.push({
      label: `Colores (${state.estrella.colores.length})`,
      value: `<div class="summary-colors"><div class="summary-colors__dots">${dotsHTML}</div><span class="summary-colors__names">${state.estrella.colores.map(c => c.nombre).join(", ")}</span></div>`,
      isHTML: true,
    });
    rows.push({ label: "Temática", value: `${state.estrella.emoji} ${state.estrella.tematica || "—"}` });
    if (state.estrella.notas) rows.push({ label: "Notas", value: state.estrella.notas });
  } else if (state.tipo === "personalizada") {
    rows.push({ label: "Tipo", value: "Personalizada" });
    if (state.personalizada.imagen) {
      rows.push({ label: "Referencia", value: `<img src="${state.personalizada.imagen}" alt="ref"/>`, isHTML: true });
    }
    rows.push({ label: "Descripción", value: state.personalizada.descripcion || "—" });
  }

  if (state.fecha) {
    const d = state.fecha;
    const weekday = WEEKDAYS_ES[d.getDay()];
    rows.push({
      label: "Recogida",
      value: `${capitalize(weekday)} ${d.getDate()} de ${MONTHS_ES[d.getMonth()].toLowerCase()}`,
    });
  }
  rows.push({ label: "Punto", value: "Laureles" });
  if (state.contacto.atendidoPor) rows.push({ label: "Atendido por", value: state.contacto.atendidoPor });
  rows.push({ label: "Pago", value: state.contacto.pagado ? "✅ Pagado" : "⏳ Pendiente" });

  rows.forEach(row => {
    const div = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = row.label;
    if (row.isHTML) {
      dd.innerHTML = row.value;
    } else {
      dd.textContent = row.value;
    }
    div.appendChild(dt);
    div.appendChild(dd);
    list.appendChild(div);
  });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ============================================================
   Enviar orden por WhatsApp
   ============================================================ */
$("#btnSubmit").addEventListener("click", () => {
  if (!state.contacto.nombre) {
    showToast("Escribe tu nombre.");
    $("#nombre").focus();
    return;
  }
  if (!state.contacto.telefono || state.contacto.telefono.replace(/\D/g, "").length < 7) {
    showToast("Escribe un número de contacto válido.");
    $("#telefono").focus();
    return;
  }
  sendOrder();
});

function sendOrder() {
  const payload = buildOrderPayload();
  const saved = saveOrder(payload);

  // Mostrar ID en pantalla de éxito
  $("#successOrderId").textContent = `Orden #${String(saved.numero).padStart(3, "0")}`;

  goTo("exito");
  launchConfetti();
}

function buildOrderMessage(orden) {
  const cfg = getConfig();
  const negocio = cfg.nombreNegocio || "Piñatería Laureles";
  const direccion = cfg.direccion || "Laureles";

  const lines = [];
  lines.push(`*🎉 Nueva orden · ${negocio}*`);
  lines.push(`Orden *#${String(orden.numero).padStart(3, "0")}*`);
  lines.push(`${formatDateTime(orden.creada)}`);
  lines.push("");
  lines.push(`👤 *Cliente:* ${orden.cliente.nombre}`);
  lines.push(`📱 *Teléfono:* ${orden.cliente.telefono}`);
  lines.push("");

  if (orden.tipo === "estrella") {
    lines.push("🪅 *Tipo:* Piñata estrella (6 picos)");
    const coloresTxt = orden.estrella.colores.map(c => c.nombre).join(", ");
    lines.push(`🎨 *Colores (${orden.estrella.colores.length}):* ${coloresTxt}`);
    lines.push(`${orden.estrella.emoji} *Temática:* ${orden.estrella.tematica}`);
    if (orden.estrella.notas) lines.push(`📝 *Notas:* ${orden.estrella.notas}`);
  } else {
    lines.push("🎨 *Tipo:* Personalizada");
    lines.push(`🖼️ *Imagen:* ${orden.personalizada.imagenNombre} (adjuntar manualmente)`);
    lines.push(`📝 *Descripción:* ${orden.personalizada.descripcion}`);
  }

  lines.push("");
  lines.push(`📅 *Recogida:* ${formatDateLong(orden.recogida)}`);
  lines.push(`📍 *Punto:* ${direccion}`);
  lines.push(`💰 *Pago:* ${orden.pagado ? "✅ Pagado" : "⏳ Pendiente"}`);
  if (orden.cliente.atendidoPor) lines.push(`👤 *Atendido por:* ${orden.cliente.atendidoPor}`);
  lines.push("");
  lines.push("¡Gracias! 💖");

  return lines.join("\n");
}

/* ============================================================
   Pantalla de éxito
   ============================================================ */
$("#btnRestart").addEventListener("click", () => {
  resetState();
  goTo("welcome");
});

function resetState() {
  state.tipo = null;
  state.history = [];
  state.estrella = {
    colores: [],
    tematica: "",
    emoji: "🪅",
    notas: "",
  };
  state.personalizada = { imagen: null, imagenNombre: "", descripcion: "" };
  state.fecha = null;
  state.contacto = { nombre: "", telefono: "", atendidoPor: "", pagado: false };

  $("#atendidoPor").value = "";
  $("#payNo").classList.add("is-active");
  $("#payYes").classList.remove("is-active");
  $("#tematica").value = "";
  $("#estrellaNotas").value = "";
  $("#descripcion").value = "";
  $("#nombre").value = "";
  $("#telefono").value = "";
  if (state.personalizada.imagen === null) {
    $("#uploaderPlaceholder").hidden = false;
    $("#uploaderPreview").hidden = true;
    $("#imgInput").value = "";
  }
  $$(".chip-sugg").forEach(b => b.classList.remove("is-active"));
  $("#starEmoji").textContent = "🪅";
  $("#starLabel").textContent = "Tu piñata";
  updateColorsUI();
  applyColorsToSvg();
  const nextBtn = byScreen("fecha").querySelector(".btn-next");
  if (nextBtn) nextBtn.disabled = true;
  $("#selectedDate").hidden = true;
}

/* ============================================================
   Toast (aviso flotante)
   ============================================================ */
let toastTimer = null;
function showToast(msg) {
  let toast = $("#toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%) translateY(60px);
      background: rgba(255, 61, 143, 0.95);
      color: #fff;
      padding: 12px 20px;
      border-radius: 99px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 10px 30px rgba(255, 61, 143, 0.4);
      z-index: 10000;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
      backdrop-filter: blur(10px);
      pointer-events: none;
      max-width: 90%;
      text-align: center;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(60px)";
  }, 2600);
}

/* ============================================================
   Confetti (canvas)
   ============================================================ */
function launchConfetti() {
  const canvas = $("#confetti");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ["#ff3d8f", "#ffd60a", "#5ee7ff", "#9d4edd", "#52ffb8", "#ff6b35"];
  const pieces = [];
  const count = 160;

  for (let i = 0; i < count; i++) {
    pieces.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 120,
      y: canvas.height / 3,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    });
  }

  let frame = 0;
  const maxFrames = 180;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.vy += 0.3; // gravedad
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.vx *= 0.99;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    frame++;
    if (frame < maxFrames) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  draw();
}

window.addEventListener("resize", () => {
  const canvas = $("#confetti");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

/* ============================================================
   Init
   ============================================================ */
/* ============================================================
   Color picker custom
   ============================================================ */
function initColorPicker() {
  const btn = $("#addColorBtn");
  const picker = $("#colorPicker");
  if (!btn || !picker) return;
  btn.addEventListener("click", () => picker.click());
  picker.addEventListener("change", (e) => {
    addCustomColor(e.target.value);
    e.target.value = "";
  });
}

/* ============================================================
   STORAGE (órdenes y configuración)
   ------------------------------------------------------------
   Arquitectura:
   - Cache en memoria (_mem) → todo lee de aquí (síncrono)
   - localStorage            → persistencia local (offline)
   - Supabase (opcional)     → sincronización en la nube + realtime
     Si está configurado: todos los dispositivos ven cambios al instante.
   ============================================================ */
const STORAGE_KEY = "pinatasOrden_v1";

// Cache en memoria
let _mem = loadLocalCache();

// Cliente Supabase (se inicializa en initCloud)
let _sb = null;
let _cloudReady = false;

function defaultStorage() {
  return {
    config: {
      whatsappPinatera: "",
      nombreNegocio: "Piñatería Laureles",
      direccion: "Laureles",
      pin: "",
    },
    ordenes: [],
    lastOrderNum: 0,
  };
}

function loadLocalCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStorage();
    const parsed = JSON.parse(raw);
    return { ...defaultStorage(), ...parsed };
  } catch (e) {
    return defaultStorage();
  }
}

function persistLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_mem));
  } catch (e) {
    console.warn("localStorage lleno:", e);
  }
}

/* ─── API síncrona que usa el resto de la app ─── */
function getConfig()  { return _mem.config; }
function getOrders()  { return _mem.ordenes; }

function saveConfig(cfg) {
  _mem.config = { ..._mem.config, ...cfg };
  persistLocal();
  cloudSaveConfig(_mem.config);
}

function saveOrder(orden) {
  _mem.lastOrderNum = (_mem.lastOrderNum || 0) + 1;
  orden.numero    = _mem.lastOrderNum;
  orden.id        = "ord_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  orden.creada    = Date.now();
  orden.estado    = "pendiente";
  orden.historial = [{ fecha: Date.now(), accion: "Orden creada" }];
  _mem.ordenes.unshift(orden);
  persistLocal();
  // Marcar para no notificarnos a nosotros mismos cuando vuelva por realtime
  _recentlyCreatedIds.add(orden.id);
  setTimeout(() => _recentlyCreatedIds.delete(orden.id), 30000);
  cloudSaveOrder(orden);
  return orden;
}

function updateOrder(id, patch) {
  const idx = _mem.ordenes.findIndex(o => o.id === id);
  if (idx < 0) return null;
  _mem.ordenes[idx] = { ..._mem.ordenes[idx], ...patch };
  persistLocal();
  cloudUpdateOrder(_mem.ordenes[idx]);
  return _mem.ordenes[idx];
}

function deleteOrder(id) {
  _mem.ordenes = _mem.ordenes.filter(o => o.id !== id);
  persistLocal();
  cloudDeleteOrder(id);
}

function addHistory(id, accion, nota) {
  const o = _mem.ordenes.find(o => o.id === id);
  if (!o) return;
  o.historial = o.historial || [];
  o.historial.push({ fecha: Date.now(), accion, nota });
  persistLocal();
  cloudUpdateOrder(o);
}

/* ============================================================
   SINCRONIZACIÓN CON SUPABASE (realtime)
   ============================================================ */
async function initCloud() {
  const conf = window.SUPABASE_CONFIG || {};
  if (!conf.url || !conf.anonKey) {
    console.info("ℹ️ Supabase no configurado → modo solo-local");
    updateCloudBadge(false);
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    console.warn("Supabase SDK no cargado");
    return;
  }
  try {
    _sb = window.supabase.createClient(conf.url, conf.anonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
    await pullAllFromCloud();
    subscribeToCloudChanges();
    _cloudReady = true;
    updateCloudBadge(true);
    console.info("☁️ Supabase conectado — realtime activo");

    // Reconexión cuando la pestaña/app vuelve al frente (móvil, celular)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && _sb) {
        pullAllFromCloud().catch(() => {});
      }
    });

    // Reconexión al recuperar internet
    window.addEventListener("online", () => {
      if (_sb) pullAllFromCloud().catch(() => {});
    });
  } catch (e) {
    console.warn("Supabase falló, sigo con localStorage:", e);
    updateCloudBadge(false);
  }
}

function updateCloudBadge(online) {
  const dot = document.querySelector(".brand__dot");
  if (!dot) return;
  dot.title = online ? "Sincronizado en la nube ☁️" : "Modo local (sin nube)";
  dot.style.boxShadow = online
    ? "0 0 12px #10b981"
    : "";
  if (online) dot.style.background = "linear-gradient(135deg, #10b981, #06b6d4)";
}

async function pullAllFromCloud() {
  if (!_sb) return;
  const [ord, cfg] = await Promise.all([
    _sb.from("orders").select("*").order("numero", { ascending: false }),
    _sb.from("app_config").select("*").eq("id", "default").maybeSingle(),
  ]);
  if (ord.error)  throw ord.error;
  if (cfg.error)  throw cfg.error;

  _mem.ordenes = (ord.data || []).map(rowToOrder);
  _mem.lastOrderNum = _mem.ordenes.reduce((m, o) => Math.max(m, o.numero || 0), 0);
  if (cfg.data) {
    _mem.config = {
      whatsappPinatera: cfg.data.whatsapp  || "",
      nombreNegocio:    cfg.data.nombre    || "Piñatería Laureles",
      direccion:        cfg.data.direccion || "Laureles",
      pin:              cfg.data.pin       || "",
    };
  }
  persistLocal();
  if (state.step === "admin") renderAdmin();
}

function rowToOrder(row) {
  return {
    ...(row.data || {}),
    id:       row.id,
    numero:   row.numero,
    estado:   row.estado,
    pagado:   !!row.pagado,
    creada:   row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function subscribeToCloudChanges() {
  _sb.channel("orders-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => {
      if (p.eventType === "INSERT" || p.eventType === "UPDATE") {
        const o = rowToOrder(p.new);
        const isNew = !_mem.ordenes.some(x => x.id === o.id);
        const idx = _mem.ordenes.findIndex(x => x.id === o.id);
        if (idx >= 0) _mem.ordenes[idx] = o;
        else          _mem.ordenes.unshift(o);
        _mem.ordenes.sort((a, b) => (b.numero || 0) - (a.numero || 0));
        _mem.lastOrderNum = Math.max(_mem.lastOrderNum, o.numero || 0);
        persistLocal();
        if (state.step === "admin") renderAdmin();
        flashBadgeNew();

        // Solo notificar para órdenes nuevas que NO acaben de salir de este dispositivo
        if (p.eventType === "INSERT" && isNew && !_recentlyCreatedIds.has(o.id)) {
          notifyNewOrder(o);
        }
      } else if (p.eventType === "DELETE") {
        _mem.ordenes = _mem.ordenes.filter(x => x.id !== p.old.id);
        persistLocal();
        if (state.step === "admin") renderAdmin();
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "app_config" }, (p) => {
      if (p.new) {
        _mem.config = {
          whatsappPinatera: p.new.whatsapp  || "",
          nombreNegocio:    p.new.nombre    || "Piñatería Laureles",
          direccion:        p.new.direccion || "Laureles",
          pin:              p.new.pin       || "",
        };
        persistLocal();
        if (state.step === "admin") renderAdmin();
      }
    })
    .subscribe();
}

function flashBadgeNew() {
  const badge = document.querySelector("#adminBadge");
  if (!badge) return;
  badge.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.6)" }, { transform: "scale(1)" }],
    { duration: 550, easing: "cubic-bezier(.22,1,.36,1)" }
  );
}

/* ─── Fire-and-forget helpers ─── */
function cloudSaveOrder(orden) {
  if (!_cloudReady) return;
  _sb.from("orders").insert({
    id:     orden.id,
    estado: orden.estado,
    pagado: !!orden.pagado,
    data:   orden,
  }).select().maybeSingle().then(({ data, error }) => {
    if (error) { console.error("cloudSaveOrder:", error); return; }
    if (data && data.numero && data.numero !== orden.numero) {
      const local = _mem.ordenes.find(o => o.id === orden.id);
      if (local) {
        local.numero = data.numero;
        _mem.lastOrderNum = Math.max(_mem.lastOrderNum, data.numero);
        persistLocal();
        if (state.step === "admin") renderAdmin();
        const successEl = document.querySelector("#successOrderId");
        if (successEl) successEl.textContent = `Orden #${String(data.numero).padStart(3, "0")}`;
      }
    }
  });
}

function cloudUpdateOrder(orden) {
  if (!_cloudReady) return;
  _sb.from("orders").update({
    estado: orden.estado,
    pagado: !!orden.pagado,
    data:   orden,
  }).eq("id", orden.id).then(({ error }) => {
    if (error) console.error("cloudUpdateOrder:", error);
  });
}

function cloudDeleteOrder(id) {
  if (!_cloudReady) return;
  _sb.from("orders").delete().eq("id", id).then(({ error }) => {
    if (error) console.error("cloudDeleteOrder:", error);
  });
}

function cloudSaveConfig(cfg) {
  if (!_cloudReady) return;
  _sb.from("app_config").upsert({
    id:        "default",
    whatsapp:  cfg.whatsappPinatera || "",
    nombre:    cfg.nombreNegocio    || "",
    direccion: cfg.direccion        || "",
    pin:       cfg.pin              || "",
  }).then(({ error }) => {
    if (error) console.error("cloudSaveConfig:", error);
  });
}

/* ============================================================
   Redimensionar imagen antes de guardar (para no llenar storage)
   ============================================================ */
function resizeImage(file, maxSize = 1024, quality = 0.82) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h) {
          if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; }
        } else {
          if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   ADMIN / DASHBOARD
   ============================================================ */
let adminFilter = "todas";

function buildOrderPayload() {
  const now = new Date();
  const base = {
    cliente: {
      nombre: state.contacto.nombre,
      telefono: state.contacto.telefono,
      atendidoPor: state.contacto.atendidoPor,
    },
    pagado: state.contacto.pagado,
    tipo: state.tipo,
    recogida: state.fecha ? state.fecha.getTime() : null,
    creadaDate: now.getTime(),
  };
  if (state.tipo === "estrella") {
    base.estrella = {
      colores: state.estrella.colores.map(c => ({ ...c })),
      tematica: state.estrella.tematica,
      emoji: state.estrella.emoji,
      notas: state.estrella.notas,
    };
  } else {
    base.personalizada = {
      imagen: state.personalizada.imagen,
      imagenNombre: state.personalizada.imagenNombre,
      descripcion: state.personalizada.descripcion,
    };
  }
  return base;
}

function formatDateShort(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${WEEKDAYS_ES[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS_ES[d.getMonth()].toLowerCase().slice(0, 3)}`;
}

function formatDateTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} · ${hh}:${mm}`;
}

function formatDateLong(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${capitalize(WEEKDAYS_ES[d.getDay()])} ${d.getDate()} de ${MONTHS_ES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
}

function renderAdmin() {
  const ordenes = getOrders();
  const list = $("#ordersList");
  const empty = $("#adminEmpty");
  const cfg = getConfig();

  // Estadísticas
  const counts = { pendiente: 0, "con-duda": 0, lista: 0, entregada: 0 };
  ordenes.forEach(o => { counts[o.estado] = (counts[o.estado] || 0) + 1; });
  $('[data-stat="pendiente"]').textContent = counts.pendiente;
  $('[data-stat="duda"]').textContent = counts["con-duda"];
  $('[data-stat="lista"]').textContent = counts.lista;

  // Badge en topbar
  const badge = $("#adminBadge");
  const pendingTotal = counts.pendiente + counts["con-duda"];
  if (pendingTotal > 0) {
    badge.textContent = pendingTotal;
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }

  // Filtrar
  let filtered;
  if (adminFilter === "todas") {
    // "Todas" muestra solo pendientes y con-duda (las listas/entregadas van a su filtro)
    filtered = ordenes.filter(o => o.estado !== "lista" && o.estado !== "entregada");
  } else {
    filtered = ordenes.filter(o => o.estado === adminFilter);
  }

  list.innerHTML = "";
  if (filtered.length === 0) {
    empty.hidden = false;
    list.hidden = true;
  } else {
    empty.hidden = true;
    list.hidden = false;
    filtered.forEach(o => list.appendChild(renderOrderCard(o, cfg)));
  }

  // Subtitulo con el WhatsApp configurado
  const sub = $("#adminSubtitle");
  if (!cfg.whatsappPinatera) {
    sub.innerHTML = `⚠️ Configura tu <strong>WhatsApp</strong> para recibir órdenes`;
  } else {
    sub.textContent = `${ordenes.length} órden${ordenes.length === 1 ? "" : "es"} en total`;
  }

  // Aviso si notificaciones no están activadas
  let notifBanner = $("#notifActivateBanner");
  const perm = ("Notification" in window) ? Notification.permission : "unsupported";
  if (perm !== "granted" && perm !== "unsupported") {
    if (!notifBanner) {
      notifBanner = document.createElement("div");
      notifBanner.id = "notifActivateBanner";
      notifBanner.style.cssText = "background:linear-gradient(135deg,#fef3c7,#fde68a);border:1.5px solid #f59e0b;border-radius:14px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;font-size:13px;font-weight:600;color:#92400e;cursor:pointer";
      notifBanner.innerHTML = `<span style="font-size:20px">🔔</span><span style="flex:1">Activa las <strong>notificaciones</strong> para saber cuándo llega una orden nueva</span><button style="border:0;background:#f59e0b;color:#fff;font-weight:800;font-size:12px;padding:7px 14px;border-radius:10px;cursor:pointer;font-family:inherit;white-space:nowrap" id="notifActivateBtn">Activar</button>`;
      list.parentElement.insertBefore(notifBanner, list);
    }
    document.getElementById("notifActivateBtn")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const r = await requestNotificationPermission();
      if (r.ok) {
        notifBanner.remove();
        showToast("🔔 Notificaciones activadas");
        setTimeout(() => showSystemNotification("🪅 ¡Listo!", "Recibirás aviso de nuevas órdenes", "test-welcome"), 400);
      } else if (r.message) {
        alert(r.message);
      }
    });
  } else if (notifBanner) {
    notifBanner.remove();
  }
}

function renderOrderCard(o, cfg) {
  const card = document.createElement("div");
  card.className = `order-card order-card--${o.estado}`;
  card.dataset.id = o.id;

  const statusLabels = {
    "pendiente": "Pendiente",
    "con-duda": "Con duda",
    "lista": "Lista",
    "entregada": "Entregada",
  };

  const emoji = o.tipo === "estrella" ? (o.estrella?.emoji || "🪅") : "🎨";
  const pagoBadge = o.pagado
    ? `<span class="status-badge status-badge--lista">✅ Pagado</span>`
    : `<span class="status-badge status-badge--pago">💰 Sin pagar</span>`;
  let tipoInfo = "";
  if (o.tipo === "estrella") {
    const numCol = o.estrella?.colores?.length || 0;
    const dots = (o.estrella?.colores || [])
      .map(c => `<span style="background:${c.hex}"></span>`).join("");
    tipoInfo = `
      <div>Estrella 6 picos · <strong>${numCol} color${numCol === 1 ? "" : "es"}</strong>
        <span class="order-card__colors">${dots}</span>
      </div>
      <div>Temática: <strong>${o.estrella?.emoji || ""} ${o.estrella?.tematica || "—"}</strong></div>
      ${o.estrella?.notas ? `<div>Nota: ${escapeHTML(o.estrella.notas)}</div>` : ""}
    `;
  } else {
    tipoInfo = `
      <div><strong>Piñata personalizada</strong></div>
      ${o.personalizada?.imagen ? `<img class="order-card__ref" src="${o.personalizada.imagen}" alt="Referencia"/>` : ""}
      <div>${escapeHTML(o.personalizada?.descripcion || "")}</div>
    `;
  }

  const waPhone = (o.cliente?.telefono || "").replace(/\D/g, "");
  const canCall = waPhone.length >= 7;

  // Para "Preguntar a Laureles" usamos el WhatsApp del negocio configurado en ⚙️
  const _cfgWA = (getConfig().whatsappPinatera || "").replace(/\D/g, "");
  const canAskLaureles = _cfgWA.length >= 7;

  card.innerHTML = `
    <div class="order-card__top">
      <div class="order-card__id">
        <span class="order-card__emoji">${emoji}</span>#${String(o.numero).padStart(3, "0")}
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;">
        <span class="status-badge status-badge--${o.estado}">${statusLabels[o.estado]}</span>
        ${pagoBadge}
      </div>
    </div>
    <div class="order-card__client">${escapeHTML(o.cliente?.nombre || "Sin nombre")}</div>
    ${o.cliente?.atendidoPor ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Atendido por: <strong style="color:var(--text-soft)">${escapeHTML(o.cliente.atendidoPor)}</strong></div>` : ""}
    <div class="order-card__phone">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
      ${escapeHTML(o.cliente?.telefono || "Sin teléfono")}
    </div>
    <div class="order-card__info">
      ${tipoInfo}
      <div>Recogida: <strong>${formatDateLong(o.recogida)}</strong></div>
    </div>
    <div class="order-card__actions">

      ${o.estado !== "lista" && o.estado !== "entregada" ? `
        <button class="action-btn action-btn--primary action-btn--full" data-act="marcar-lista" data-id="${o.id}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Marcar como lista
        </button>
      ` : ""}

      ${o.estado === "lista" ? `
        <button class="action-btn action-btn--whatsapp action-btn--full desktop-only" data-act="notificar" data-id="${o.id}" ${!canCall ? "disabled" : ""}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
          Avisar al cliente que está lista
        </button>
        <button class="action-btn action-btn--neutral action-btn--full desktop-only" data-act="entregada" data-id="${o.id}">
          Marcar entregada
        </button>
      ` : ""}

      ${o.estado !== "lista" && o.estado !== "entregada" ? `
        <button class="action-btn action-btn--whatsapp" data-act="preguntar" data-id="${o.id}" ${!canAskLaureles ? "disabled" : ""} title="${canAskLaureles ? "Enviar duda a Laureles para que ellos contacten al cliente" : "Configura el WhatsApp de Laureles en ⚙️"}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          Preguntar a Laureles
        </button>
      ` : ""}

      <button class="action-btn action-btn--neutral" data-act="ver" data-id="${o.id}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Ver detalle
        </button>

      <button class="action-btn action-btn--print desktop-only" data-act="imprimir" data-id="${o.id}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimir
        </button>

      <button class="action-btn ${o.pagado ? "action-btn--neutral" : "action-btn--whatsapp"} desktop-only" data-act="toggle-pago" data-id="${o.id}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          ${o.pagado ? "Quitar pago" : "Marcar pagado"}
        </button>

      <button class="action-btn action-btn--edit desktop-only" data-act="editar" data-id="${o.id}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Editar
        </button>

      <button class="action-btn action-btn--danger desktop-only" data-act="eliminar" data-id="${o.id}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          Eliminar
        </button>

    </div>
    <div class="order-card__date">Creada: ${formatDateTime(o.creada)}</div>
  `;

  // Action handlers
  card.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    e.preventDefault();
    const act = btn.dataset.act;
    const id = btn.dataset.id;
    handleOrderAction(act, id);
  });

  return card;
}

function handleOrderAction(act, id) {
  const orden = getOrders().find(o => o.id === id);
  if (!orden) return;

  if (act === "toggle-pago") {
    const nuevo = !orden.pagado;
    updateOrder(id, { pagado: nuevo });
    addHistory(id, nuevo ? "Marcado como pagado" : "Pago revertido");
    showToast(nuevo ? "💰 Marcado como pagado" : "Pago revertido");
    renderAdmin();
    return;
  }
  if (act === "marcar-lista") {
    updateOrder(id, { estado: "lista" });
    addHistory(id, "Marcada como lista");
    showToast("✅ Marcada como lista");
    renderAdmin();
    // Preguntar si quiere avisar al cliente ahora
    setTimeout(() => {
      if (confirm("¿Avisar al cliente por WhatsApp que su piñata está lista?")) {
        notificarCliente(id);
      }
    }, 400);
  } else if (act === "entregada") {
    updateOrder(id, { estado: "entregada" });
    addHistory(id, "Marcada como entregada");
    showToast("Marcada como entregada");
    renderAdmin();
  } else if (act === "preguntar") {
    preguntarCliente(id);
  } else if (act === "notificar") {
    notificarCliente(id);
  } else if (act === "imprimir") {
    printTicket(id);
  } else if (act === "ver") {
    openOrderDetail(id);
  } else if (act === "editar") {
    openEditModal(id);
  } else if (act === "eliminar") {
    if (confirm(`¿Eliminar la orden #${String(orden.numero).padStart(3, "0")} de ${orden.cliente?.nombre || ""}?`)) {
      deleteOrder(id);
      showToast("Orden eliminada");
      renderAdmin();
    }
  }
}

/* ============================================================
   EDITAR ORDEN
   ============================================================ */
function openEditModal(id) {
  const o = getOrders().find(x => x.id === id);
  if (!o) return;

  const modal = $("#editModal");
  const body  = $("#editModalBody");
  const title = $("#editModalTitle");
  title.textContent = `Editar orden #${String(o.numero).padStart(3, "0")}`;

  // Fecha actual como valor por defecto
  const fechaVal = o.recogida ? new Date(o.recogida).toISOString().split("T")[0] : "";

  // Colores estrella
  const coloresHex = (o.estrella?.colores || []).map(c => c.hex || "#ec4899");

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px">

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label class="form-label">Nombre del cliente</label>
          <input class="form-input" id="editNombre" value="${escapeHTML(o.cliente?.nombre || "")}" placeholder="Nombre">
        </div>
        <div>
          <label class="form-label">Teléfono</label>
          <input class="form-input" id="editTelefono" value="${escapeHTML(o.cliente?.telefono || "")}" placeholder="Teléfono" type="tel">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label class="form-label">Atendido por</label>
          <input class="form-input" id="editAtendido" value="${escapeHTML(o.cliente?.atendidoPor || "")}" placeholder="Nombre del vendedor">
        </div>
        <div>
          <label class="form-label">Fecha de recogida</label>
          <input class="form-input" id="editFecha" type="date" value="${fechaVal}">
        </div>
      </div>

      ${o.tipo === "estrella" ? `
      <div>
        <label class="form-label">Temática</label>
        <input class="form-input" id="editTematica" value="${escapeHTML(o.estrella?.tematica || "")}" placeholder="Ej: Minecraft, unicornios...">
      </div>
      <div>
        <label class="form-label">Colores (${coloresHex.length})</label>
        <div id="editColoresWrap" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px;border:1.5px solid var(--border-color);border-radius:12px">
          ${coloresHex.map((hex, i) => `
            <label style="display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;font-weight:700;cursor:pointer">
              <input type="color" value="${hex}" data-ci="${i}" style="width:36px;height:36px;border:none;border-radius:50%;cursor:pointer;background:none;padding:2px" title="Color ${i+1}">
              ${i+1}
            </label>
          `).join("")}
        </div>
      </div>
      <div>
        <label class="form-label">Notas</label>
        <textarea class="form-input" id="editNotas" rows="2" placeholder="Notas adicionales...">${escapeHTML(o.estrella?.notas || "")}</textarea>
      </div>
      ` : `
      <div>
        <label class="form-label">Descripción / instrucciones</label>
        <textarea class="form-input" id="editDesc" rows="3" placeholder="Descripción de la piñata...">${escapeHTML(o.personalizada?.descripcion || "")}</textarea>
      </div>
      `}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label class="form-label">Estado</label>
          <select class="form-input" id="editEstado">
            <option value="pendiente" ${o.estado==="pendiente"?"selected":""}>Pendiente</option>
            <option value="con-duda" ${o.estado==="con-duda"?"selected":""}>Con duda</option>
            <option value="lista" ${o.estado==="lista"?"selected":""}>Lista</option>
            <option value="entregada" ${o.estado==="entregada"?"selected":""}>Entregada</option>
          </select>
        </div>
        <div>
          <label class="form-label">Pago</label>
          <select class="form-input" id="editPago">
            <option value="no" ${!o.pagado?"selected":""}>Sin pagar</option>
            <option value="si" ${o.pagado?"selected":""}>Pagado</option>
          </select>
        </div>
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px">
        <button class="btn btn-ghost" id="editCancelBtn">Cancelar</button>
        <button class="btn btn-primary" id="editSaveBtn">Guardar cambios</button>
      </div>
    </div>
  `;

  modal.hidden = false;

  // Cancelar
  $("#editCancelBtn").addEventListener("click", () => { modal.hidden = true; });
  modal.querySelector("[data-close-modal]")?.addEventListener("click", () => { modal.hidden = true; });

  // Guardar
  $("#editSaveBtn").addEventListener("click", () => {
    const nombre   = $("#editNombre").value.trim();
    const telefono = $("#editTelefono").value.trim();
    const atendido = $("#editAtendido").value.trim();
    const fechaRaw = $("#editFecha").value;
    const estado   = $("#editEstado").value;
    const pagado   = $("#editPago").value === "si";
    const recogida = fechaRaw ? new Date(fechaRaw + "T12:00:00").getTime() : o.recogida;

    const patch = {
      cliente: { ...o.cliente, nombre, telefono, atendidoPor: atendido },
      estado,
      pagado,
      recogida,
    };

    if (o.tipo === "estrella") {
      // Recoger colores editados
      const colInputs = $("#editColoresWrap").querySelectorAll("input[type=color]");
      const newColores = Array.from(colInputs).map((inp, i) => ({
        ...((o.estrella?.colores || [])[i] || {}),
        hex: inp.value,
      }));
      patch.estrella = {
        ...o.estrella,
        tematica: $("#editTematica").value.trim(),
        notas:    $("#editNotas").value.trim(),
        colores:  newColores,
      };
    } else {
      patch.personalizada = {
        ...o.personalizada,
        descripcion: $("#editDesc").value.trim(),
      };
    }

    updateOrder(id, patch);
    addHistory(id, "Orden editada");
    modal.hidden = true;
    showToast("✏️ Orden actualizada");
    renderAdmin();
  });
}

function preguntarCliente(id) {
  const o = getOrders().find(x => x.id === id);
  if (!o) return;
  const cfg = getConfig();
  const laureles = (cfg.whatsappPinatera || "").replace(/\D/g, "");
  if (!laureles) {
    showToast("Configura el WhatsApp de Laureles en ⚙️");
    return;
  }

  const num = String(o.numero || 0).padStart(3, "0");

  // Mostrar info de la orden en el modal
  const infoEl = document.getElementById("dudaOrdenInfo");
  if (infoEl) {
    infoEl.textContent = `Orden #${num} · ${o.cliente?.nombre || "—"} · ${formatDateLong(o.recogida)}`;
  }

  // Limpiar textarea
  const textarea = document.getElementById("dudaTexto");
  if (textarea) textarea.value = "";

  // Conectar botón de envío
  const btnEnviar = document.getElementById("btnEnviarDuda");
  if (btnEnviar) {
    // Clonar para quitar listeners anteriores
    const nuevo = btnEnviar.cloneNode(true);
    btnEnviar.parentNode.replaceChild(nuevo, btnEnviar);

    nuevo.addEventListener("click", () => {
      const duda = (document.getElementById("dudaTexto")?.value || "").trim();
      if (!duda) {
        document.getElementById("dudaTexto")?.focus();
        showToast("Escribe tu duda antes de enviar");
        return;
      }

      const fechaStr = formatDateLong(o.recogida);
      let detallePinata;
      if (o.tipo === "estrella") {
        const colores = (o.estrella?.colores || []).join(", ");
        const tema = o.estrella?.tematica ? ` · ${o.estrella.tematica}` : "";
        detallePinata = `Estrella 6 picos · ${(o.estrella?.colores || []).length} color(es)${colores ? ` (${colores})` : ""}${tema}`;
      } else {
        const desc = (o.personalizada?.descripcion || "").trim();
        detallePinata = `Personalizada${desc ? ` · ${desc.slice(0, 80)}${desc.length > 80 ? "..." : ""}` : ""}`;
      }

      const lines = [
        `🪅 *Duda con orden #${num}*`,
        "",
        `*Cliente:* ${o.cliente?.nombre || "—"}`,
        o.cliente?.telefono ? `*Tel cliente:* ${o.cliente.telefono}` : null,
        `*Piñata:* ${detallePinata}`,
        `*Recogida:* ${fechaStr}`,
        o.atendido ? `*Atendido por:* ${o.atendido}` : null,
        "",
        `*Duda:* ${duda}`,
      ].filter(Boolean);

      const url = `https://wa.me/${laureles}?text=${encodeURIComponent(lines.join("\n"))}`;
      window.open(url, "_blank");

      closeAllModals();
      updateOrder(id, { estado: "con-duda" });
      addHistory(id, `Duda enviada a Laureles: ${duda.slice(0, 60)}`);
      renderAdmin();
    });
  }

  openModal("#dudaModal");
}

function notificarCliente(id) {
  const o = getOrders().find(x => x.id === id);
  if (!o) return;
  const telefono = (o.cliente?.telefono || "").replace(/\D/g, "");
  if (!telefono) { showToast("Sin teléfono del cliente"); return; }
  const cfg = getConfig();
  const negocio = cfg.nombreNegocio || "la piñatería";
  const direccion = cfg.direccion || "Laureles";
  const fechaStr = formatDateLong(o.recogida);

  const lines = [
    `¡Hola ${o.cliente.nombre}! 🎉`,
    "",
    `Te escribo de *${negocio}* para avisarte que tu piñata está *LISTA* 🪅✨`,
    "",
    `📋 *Orden:* #${String(o.numero).padStart(3, "0")}`,
    `📅 *Recogida:* ${fechaStr}`,
    `📍 *Punto:* ${direccion}`,
    "",
    "¡Te esperamos! 💖",
  ];
  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(lines.join("\n"))}`;
  window.open(url, "_blank");

  addHistory(id, "Cliente notificado");
  showToast("WhatsApp abierto");
}

function openOrderDetail(id) {
  const o = getOrders().find(x => x.id === id);
  if (!o) return;
  const body  = $("#orderModalBody");
  const title = $("#orderModalTitle");
  const num   = String(o.numero).padStart(3, "0");
  title.textContent = `Orden #${num}`;

  const cfg = getConfig();
  const estadoBadge = {
    "pendiente":  { label: "Pendiente",  color: "#f59e0b" },
    "con-duda":   { label: "Con duda",   color: "#ec4899" },
    "lista":      { label: "Lista",      color: "#22c55e" },
    "entregada":  { label: "Entregada",  color: "#6366f1" },
  }[o.estado] || { label: o.estado, color: "#999" };

  // Sección visual de la piñata
  let visualHtml = "";
  if (o.tipo === "estrella") {
    const colores = o.estrella?.colores || [];
    const dotsHtml = colores.map(c => `
      <div class="detail-color-chip">
        <span class="detail-color-dot" style="background:${c.hex}"></span>
        <span>${escapeHTML(c.nombre)}</span>
      </div>`).join("");
    visualHtml = `
      <div class="detail-visual detail-visual--star">
        <div class="detail-visual__label">Estrella 6 picos</div>
        <div class="detail-colors-grid">${dotsHtml}</div>
        ${o.estrella?.tematica ? `<div class="detail-tematica">${o.estrella.emoji || "🎭"} ${escapeHTML(o.estrella.tematica)}</div>` : ""}
        ${o.estrella?.notas ? `<p class="detail-nota">${escapeHTML(o.estrella.notas)}</p>` : ""}
      </div>`;
  } else {
    const img = o.personalizada?.imagen
      ? `<img class="detail-photo" src="${o.personalizada.imagen}" alt="Referencia de la piñata"/>`
      : `<div class="detail-photo--empty">Sin foto de referencia</div>`;
    visualHtml = `
      <div class="detail-visual detail-visual--custom">
        ${img}
        ${o.personalizada?.descripcion ? `<p class="detail-desc">${escapeHTML(o.personalizada.descripcion)}</p>` : ""}
      </div>`;
  }

  // Historial
  const histHtml = (o.historial || []).slice().reverse().map(h => `
    <div class="detail-hist-row">
      <span class="detail-hist-dot"></span>
      <div>
        <div class="detail-hist-act">${escapeHTML(h.accion)}</div>
        <div class="detail-hist-time">${formatDateTime(h.fecha)}</div>
      </div>
    </div>`).join("") || `<p class="muted" style="font-size:13px">Sin eventos aún</p>`;

  // Botones de acción dentro del detalle (incluyendo los que en tarjeta son solo desktop)
  const canCall  = (o.cliente?.telefono || "").replace(/\D/g, "").length >= 7;
  const canLaur  = (cfg.whatsappPinatera || "").replace(/\D/g, "").length >= 7;

  body.innerHTML = `
    <div class="detail-layout">

      <!-- Columna izquierda: visual + info piñata -->
      <div class="detail-col detail-col--left">
        ${visualHtml}
      </div>

      <!-- Columna derecha: datos + acciones -->
      <div class="detail-col detail-col--right">

        <!-- Estado + pago -->
        <div class="detail-header-row">
          <span class="detail-estado" style="background:${estadoBadge.color}20;color:${estadoBadge.color};border:1.5px solid ${estadoBadge.color}40">${estadoBadge.label}</span>
          <span class="detail-pago ${o.pagado ? "is-paid" : "is-unpaid"}">${o.pagado ? "Pagado" : "Sin pagar"}</span>
        </div>

        <!-- Cliente -->
        <div class="detail-section">
          <div class="detail-section__title">Cliente</div>
          <div class="detail-row"><span class="detail-lbl">Nombre</span><span>${escapeHTML(o.cliente?.nombre || "—")}</span></div>
          <div class="detail-row"><span class="detail-lbl">Teléfono</span><span>${escapeHTML(o.cliente?.telefono || "—")}</span></div>
          ${o.atendido ? `<div class="detail-row"><span class="detail-lbl">Atendido por</span><span>${escapeHTML(o.atendido)}</span></div>` : ""}
        </div>

        <!-- Recogida -->
        <div class="detail-section">
          <div class="detail-section__title">Recogida</div>
          <div class="detail-row"><span class="detail-lbl">Fecha</span><span><strong>${formatDateLong(o.recogida)}</strong></span></div>
          <div class="detail-row"><span class="detail-lbl">Lugar</span><span>${escapeHTML(cfg.direccion || "Laureles")}</span></div>
          <div class="detail-row"><span class="detail-lbl">Creada</span><span>${formatDateTime(o.creada)}</span></div>
        </div>

        <!-- Acciones completas (siempre disponibles en el detalle) -->
        <div class="detail-section">
          <div class="detail-section__title">Acciones</div>
          <div class="detail-actions-grid">
            ${o.estado !== "lista" && o.estado !== "entregada" ? `
              <button class="detail-act-btn detail-act-btn--primary" data-act="marcar-lista" data-id="${o.id}">Marcar lista</button>
            ` : ""}
            ${o.estado === "lista" ? `
              <button class="detail-act-btn detail-act-btn--wa" data-act="notificar" data-id="${o.id}" ${!canCall ? "disabled" : ""}>Avisar al cliente</button>
              <button class="detail-act-btn" data-act="entregada" data-id="${o.id}">Marcar entregada</button>
            ` : ""}
            ${o.estado !== "lista" && o.estado !== "entregada" ? `
              <button class="detail-act-btn detail-act-btn--wa" data-act="preguntar" data-id="${o.id}" ${!canLaur ? "disabled" : ""}>Preguntar a Laureles</button>
            ` : ""}
            <button class="detail-act-btn" data-act="toggle-pago" data-id="${o.id}">${o.pagado ? "Quitar pago" : "Marcar pagado"}</button>
            <button class="detail-act-btn" data-act="imprimir" data-id="${o.id}">Imprimir ticket</button>
            <button class="detail-act-btn detail-act-btn--danger" data-act="eliminar" data-id="${o.id}">Eliminar orden</button>
          </div>
        </div>

        <!-- Historial -->
        <div class="detail-section">
          <div class="detail-section__title">Historial</div>
          <div class="detail-hist">${histHtml}</div>
        </div>

      </div>
    </div>
  `;

  // Delegar clicks de acciones dentro del modal
  body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const bid = btn.dataset.id;
    closeAllModals();
    setTimeout(() => handleOrderAction(act, bid), 100);
  }, { once: true });

  openModal("#orderModal");
}

/* ============================================================
   Impresión en ticket (80mm)
   ============================================================ */
function printTicket(id) {
  const o = getOrders().find(x => x.id === id);
  if (!o) return;
  const cfg = getConfig();
  const negocio = escapeHTML(cfg.nombreNegocio || "PIÑATERÍA LAURELES").toUpperCase();
  const direccion = escapeHTML(cfg.direccion || "Laureles");
  const numOrden = String(o.numero).padStart(3, "0");
  const coloresTxt = o.tipo === "estrella"
    ? (o.estrella?.colores || []).map(c => c.nombre).join("  ·  ")
    : "";
  const dotRows = o.tipo === "estrella"
    ? (o.estrella?.colores || []).map(c =>
        `<div class="dot-row">
          <span class="dot" style="background:${c.hex};"></span>
          <span class="dot-name">${escapeHTML(c.nombre)}</span>
        </div>`).join("")
    : "";

  const ticketHTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Orden #${numOrden}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
    font-size: 14px;
    font-weight: 800;
    width: 80mm;
    max-width: 80mm;
    margin: 0 auto;
    color: #000;
    background: #fff;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ─── CABECERA ─── */
  .header {
    background: #000;
    color: #fff;
    text-align: center;
    padding: 7mm 4mm 5mm;
  }
  .header__brand {
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    line-height: 1.1;
  }
  .header__sub {
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-top: 3px;
  }

  /* ─── NÚMERO DE ORDEN ─── */
  .order-num {
    text-align: center;
    padding: 5mm 4mm 4mm;
    border-bottom: 3px solid #111;
  }
  .order-num__tag {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #111;
    display: block;
    margin-bottom: 2px;
  }
  .order-num__num {
    font-size: 46px;
    font-weight: 900;
    letter-spacing: -0.03em;
    line-height: 1;
    color: #111;
  }
  .order-num__date {
    font-size: 13px;
    font-weight: 800;
    color: #111;
    margin-top: 4px;
  }

  /* ─── BLOQUES ─── */
  .block {
    padding: 4mm 4mm 3mm;
    border-bottom: 2px solid #000;
  }
  .block:last-of-type { border-bottom: none; }

  .block__label {
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #111;
    margin-bottom: 5px;
    display: block;
  }

  .field {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px;
    padding: 2px 0;
  }
  .field__key {
    font-size: 12px;
    font-weight: 900;
    color: #111;
    flex-shrink: 0;
  }
  .field__val {
    font-size: 13px;
    font-weight: 800;
    color: #111;
    text-align: right;
    word-break: break-word;
  }
  .field--block {
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
  }
  .field--block .field__val {
    text-align: left;
    font-size: 13px;
  }

  /* ─── NOMBRE GRANDE DEL CLIENTE ─── */
  .client-name {
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.02em;
    color: #111;
    line-height: 1.1;
    margin-bottom: 2px;
  }
  .client-tel {
    font-size: 15px;
    font-weight: 800;
    color: #111;
    letter-spacing: 0.02em;
  }

  /* ─── TEMÁTICA ─── */
  .tematica-wrap {
    margin: 4px 0 6px;
  }
  .tematica-name {
    font-size: 22px;
    font-weight: 900;
    color: #000;
    letter-spacing: -0.02em;
    line-height: 1.1;
    text-transform: uppercase;
  }

  /* ─── COLORES ─── */
  .dot-list { margin-top: 5px; }
  .dot-row {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 2px 0;
  }
  .dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid #000;
    flex-shrink: 0;
    display: inline-block;
  }
  .dot-name {
    font-size: 14px;
    font-weight: 900;
    color: #000;
  }

  /* ─── IMAGEN REFERENCIA ─── */
  .ref-img {
    width: 100%;
    max-height: 52mm;
    object-fit: contain;
    border-radius: 3mm;
    margin: 4px 0;
    display: block;
    border: 2px solid #000;
  }

  /* ─── DESCRIPCIÓN PERSONALIZADA ─── */
  .desc-text {
    font-size: 13px;
    font-weight: 800;
    color: #000;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  /* ─── RECOGIDA ─── */
  .pickup-block {
    background: #000;
    color: #fff;
    padding: 5mm 4mm;
    text-align: center;
  }
  .pickup-block .block__label { color: #fff; }
  .pickup-date {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: -0.01em;
    text-transform: capitalize;
    line-height: 1.15;
    margin-bottom: 3px;
  }
  .pickup-loc {
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #fff;
  }

  /* ─── PIE ─── */
  .footer {
    background: #000;
    color: #fff;
    text-align: center;
    padding: 4mm 4mm 6mm;
  }
  .footer__thanks {
    font-size: 15px;
    font-weight: 900;
    color: #fff;
    margin-bottom: 3px;
    margin-top: 3mm;
  }
  .footer__negocio {
    font-size: 12px;
    font-weight: 900;
    color: #fff;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .footer__spacer { height: 12mm; }

  @media print {
    body { margin: 0; }
  }
</style>
</head>
<body>

  <!-- CABECERA -->
  <div class="header">
    <div class="header__brand">${negocio}</div>
    <div class="header__sub">Orden de piñata</div>
  </div>

  <!-- NÚMERO -->
  <div class="order-num">
    <span class="order-num__tag">Orden</span>
    <div class="order-num__num">#${numOrden}</div>
    <div class="order-num__date">${formatDateTime(o.creada)}</div>
  </div>

  <!-- CLIENTE -->
  <div class="block">
    <span class="block__label">Cliente</span>
    <div class="client-name">${escapeHTML(o.cliente?.nombre || "—")}</div>
    <div class="client-tel">${escapeHTML(o.cliente?.telefono || "—")}</div>
    ${o.cliente?.atendidoPor ? `<div style="font-size:13px;font-weight:900;margin-top:5px;text-transform:uppercase;">Atendido por: ${escapeHTML(o.cliente.atendidoPor)}</div>` : ""}
  </div>

  <!-- PAGO -->
  <div class="block" style="display:flex;align-items:center;justify-content:space-between;padding:3mm 4mm;">
    <span style="font-size:14px;font-weight:900;color:#000;">PAGO</span>
    <span style="font-size:14px;font-weight:900;color:#000;padding:4px 14px;border-radius:4px;border:2.5px solid #000;letter-spacing:0.06em;background:${o.pagado ? "#000" : "#fff"};color:${o.pagado ? "#fff" : "#000"};">
      ${o.pagado ? "  PAGADO  " : "PENDIENTE"}
    </span>
  </div>

  <!-- PIÑATA -->
  <div class="block">
    <span class="block__label">${o.tipo === "estrella" ? "Piñata estrella · 6 picos" : "Piñata personalizada"}</span>

    ${o.tipo === "estrella" ? `
      <div class="tematica-wrap">
        <div class="tematica-name">${escapeHTML(o.estrella?.tematica || "—")}</div>
      </div>
      <div class="field" style="margin-top:4px;">
        <span class="field__key">COLORES (${o.estrella?.colores?.length || 0})</span>
      </div>
      <div class="dot-list">${dotRows}</div>
      ${o.estrella?.notas ? `
        <div class="field field--block" style="margin-top:6px;">
          <span class="field__key">NOTAS</span>
          <span class="field__val">${escapeHTML(o.estrella.notas)}</span>
        </div>` : ""}
    ` : `
      ${o.personalizada?.imagen ? `<img class="ref-img" src="${o.personalizada.imagen}" alt="Referencia"/>` : ""}
      <div class="field field--block">
        <span class="field__key">DESCRIPCION</span>
        <span class="desc-text">${escapeHTML(o.personalizada?.descripcion || "—")}</span>
      </div>
    `}
  </div>

  <!-- RECOGIDA -->
  <div class="pickup-block">
    <span class="block__label">-- RECOGIDA --</span>
    <div class="pickup-date">${formatDateLong(o.recogida)}</div>
    <div class="pickup-loc">${direccion}</div>
  </div>

  <!-- PIE -->
  <div class="footer">
    <div class="footer__thanks">--- GRACIAS POR SU PREFERENCIA ---</div>
    <div class="footer__negocio">${negocio}</div>
    <div class="footer__spacer"></div>
  </div>

  <script>
    document.fonts.ready.then(function() {
      setTimeout(function() { window.print(); }, 350);
    });
  </script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=460,height=780");
  if (!w) {
    showToast("Permite ventanas emergentes para imprimir.");
    return;
  }
  w.document.open();
  w.document.write(ticketHTML);
  w.document.close();
  addHistory(id, "Ticket impreso");
}

/* ============================================================
   Modales
   ============================================================ */
function openModal(selector) {
  const modal = $(selector);
  if (!modal) return;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal(selector) {
  const modal = $(selector);
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

function closeAllModals() {
  $$(".modal").forEach(m => { m.hidden = true; });
  document.body.style.overflow = "";
}

function initModals() {
  document.addEventListener("click", (e) => {
    if (e.target.matches("[data-close-modal]") || e.target.closest("[data-close-modal]")) {
      closeAllModals();
    }
  });

  // Config modal
  $("#btnAdminConfig").addEventListener("click", openConfigModal);
  // Taller link
  const btnCopyTaller = document.getElementById("btnCopyTaller");
  const btnOpenTaller = document.getElementById("btnOpenTaller");
  const tallerUrl = window.location.origin + "/taller";
  const tallerDisplay = document.getElementById("tallerUrlDisplay");
  if (tallerDisplay) tallerDisplay.textContent = tallerUrl;
  if (btnCopyTaller) {
    btnCopyTaller.addEventListener("click", () => {
      navigator.clipboard.writeText(tallerUrl).then(() => {
        showToast("¡Enlace copiado!");
        btnCopyTaller.textContent = "¡Copiado!";
        setTimeout(() => { btnCopyTaller.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copiar enlace`; }, 2000);
      }).catch(() => {
        prompt("Copia este enlace:", tallerUrl);
      });
    });
  }
  if (btnOpenTaller) {
    btnOpenTaller.addEventListener("click", () => window.open(tallerUrl, "_blank"));
  }

  const btnInstallFromConfig = $("#btnInstallFromConfig");
  if (btnInstallFromConfig) {
    btnInstallFromConfig.addEventListener("click", () => {
      if (_deferredInstallPrompt) {
        _deferredInstallPrompt.prompt();
        _deferredInstallPrompt.userChoice.then(r => {
          if (r.outcome === "accepted") showToast("¡App instalada!");
          _deferredInstallPrompt = null;
        });
      } else {
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
        if (standalone) {
          alert("¡La app ya está instalada! Búscala en tu pantalla de inicio.");
        } else if (ios) {
          alert("En iPhone:\n1. Toca el botón Compartir ↑ (barra inferior de Safari)\n2. Selecciona 'Añadir a pantalla de inicio'\n3. Toca 'Añadir'");
        } else {
          alert("En Chrome/Edge:\n• Busca el ícono ⊕ al final de la barra de direcciones\n• O menú ⋮ → 'Instalar Piñatas...'\n\nSi no aparece, recarga la página con Ctrl+F5 y espera unos segundos.");
        }
      }
    });
  }
  $("#btnSaveConfig").addEventListener("click", saveConfigFromModal);
  $("#btnClearOrders").addEventListener("click", async () => {
    if (!confirm("¿Borrar TODAS las órdenes? Esta acción no se puede deshacer.")) return;
    const ids = _mem.ordenes.map(o => o.id);
    _mem.ordenes = [];
    _mem.lastOrderNum = 0;
    persistLocal();
    if (_cloudReady && ids.length) {
      try {
        await _sb.from("orders").delete().in("id", ids);
      } catch (e) { console.error(e); }
    }
    showToast("Todas las órdenes eliminadas");
    closeAllModals();
    renderAdmin();
  });

  // PIN modal
  $("#btnPinOk").addEventListener("click", validatePin);
  $("#btnPinCancel").addEventListener("click", () => {
    closeAllModals();
    if (state.step === "admin") goTo("welcome");
  });
  $("#pinInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") validatePin();
  });
}

function openConfigModal() {
  const cfg = getConfig();
  $("#cfgWhatsapp").value = cfg.whatsappPinatera || "";
  $("#cfgNombre").value = cfg.nombreNegocio || "";
  $("#cfgDireccion").value = cfg.direccion || "";
  $("#cfgPin").value = cfg.pin || "";
  updateNotifStatusUI();
  openModal("#configModal");
}

function saveConfigFromModal() {
  const wa = $("#cfgWhatsapp").value.replace(/\D/g, "");
  if (wa && wa.length < 7) {
    showToast("Número de WhatsApp inválido");
    return;
  }
  saveConfig({
    whatsappPinatera: wa,
    nombreNegocio: $("#cfgNombre").value.trim(),
    direccion: $("#cfgDireccion").value.trim(),
    pin: $("#cfgPin").value.trim(),
  });
  closeAllModals();
  showToast("✅ Configuración guardada");
  renderAdmin();
}

function validatePin() {
  const pin = $("#pinInput").value.trim();
  const cfg = getConfig();
  if (pin === cfg.pin) {
    closeAllModals();
    $("#pinInput").value = "";
    renderAdmin();
    goTo("admin");
  } else {
    showToast("PIN incorrecto");
    $("#pinInput").value = "";
  }
}

function requestAdminAccess() {
  const cfg = getConfig();
  if (cfg.pin) {
    $("#pinInput").value = "";
    openModal("#pinModal");
    setTimeout(() => $("#pinInput").focus(), 100);
  } else {
    renderAdmin();
    goTo("admin");
  }
}

/* ============================================================
   PWA · INSTALACIÓN, NOTIFICACIONES Y SONIDO
   ============================================================ */
let _deferredInstallPrompt = null;
let _swReg                 = null;
const _recentlyCreatedIds  = new Set();
const NOTIF_PREF_KEY       = "pinata-notif-pref";

/* ─── Service Worker ─── */
async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
    _swReg = reg;

    // Detectar nueva versión y aplicarla automáticamente
    reg.addEventListener("updatefound", () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener("statechange", () => {
        if (sw.state === "installed" && navigator.serviceWorker.controller) {
          // Hay una nueva versión esperando: pedirle que tome control
          sw.postMessage({ type: "skip-waiting" });
        }
      });
    });

    // Buscar updates al volver a la app
    setInterval(() => reg.update().catch(() => {}), 60 * 1000);

    // Esperar a que esté activo
    if (!reg.active) {
      await new Promise((resolve) => {
        const sw = reg.installing || reg.waiting;
        if (!sw) return resolve();
        sw.addEventListener("statechange", () => {
          if (sw.state === "activated") resolve();
        });
        setTimeout(resolve, 5000);
      });
    }
    return reg;
  } catch (e) {
    console.warn("SW register error:", e);
    return null;
  }
}

/* Auto-recarga cuando un nuevo SW toma control (excepto primera instalación) */
(function setupSWAutoReload() {
  if (!("serviceWorker" in navigator)) return;
  let firstControl = !navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (firstControl) { firstControl = false; return; }
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
})();

async function getReadySW() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    // navigator.serviceWorker.ready se resuelve cuando el SW está activo
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, rej) => setTimeout(() => rej(new Error("SW timeout")), 3000)),
    ]);
    return reg;
  } catch (e) {
    return _swReg || null;
  }
}

/* ─── Detección de plataforma ─── */
function detectPlatform() {
  const ua = navigator.userAgent || "";
  const isIOS     = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);
  const isMobile  = isIOS || isAndroid;
  const isStandalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true;
  return { isIOS, isAndroid, isMobile, isStandalone };
}

/* ─── Botón Instalar en topbar ─── */
function initInstallPrompt() {
  const btnTopbar = document.getElementById("btnInstallTopbar");
  const { isStandalone } = detectPlatform();

  // Capturar el evento nativo (Chrome/Edge/Android)
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _deferredInstallPrompt = e;
  });

  window.addEventListener("appinstalled", () => {
    if (btnTopbar) btnTopbar.hidden = true;
    closeAllModals();
    _deferredInstallPrompt = null;
    showToast("¡App instalada!");
  });

  // Mostrar botón en topbar solo si no está instalada
  if (!isStandalone && btnTopbar) {
    btnTopbar.hidden = false;
    btnTopbar.addEventListener("click", openInstallModal);
  }
}

/* ─── Abrir modal de instalación con el caso correcto ─── */
function openInstallModal() {
  const { isIOS, isAndroid, isMobile, isStandalone } = detectPlatform();

  // Ocultar todos los casos
  ["installCaseNative", "installCaseIOS", "installCaseAndroid", "installCaseDesktop", "installCaseInstalled"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.hidden = true; });

  let activeId;
  if (isStandalone) {
    activeId = "installCaseInstalled";
  } else if (_deferredInstallPrompt) {
    activeId = "installCaseNative";
  } else if (isIOS) {
    activeId = "installCaseIOS";
  } else if (isAndroid) {
    activeId = "installCaseAndroid";
  } else {
    activeId = "installCaseDesktop";
  }
  const active = document.getElementById(activeId);
  if (active) active.hidden = false;

  // Botón "Instalar ahora" del caso nativo
  const btnNow = $("#btnInstallNow");
  if (btnNow) {
    btnNow.onclick = async () => {
      if (!_deferredInstallPrompt) {
        showToast("Tu navegador aún no permite instalar. Sigue las instrucciones.");
        return;
      }
      try {
        _deferredInstallPrompt.prompt();
        const { outcome } = await _deferredInstallPrompt.userChoice;
        _deferredInstallPrompt = null;
        if (outcome === "accepted") {
          closeAllModals();
          showToast("✅ ¡App instalada!");
        }
      } catch (e) {
        console.warn(e);
      }
    };
  }

  openModal("#installModal");
}

/* ─── Notificaciones del sistema ─── */
function notifPermissionState() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent || "") && !window.MSStream;
}
function isStandalone() {
  return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
         window.navigator.standalone === true;
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return { ok: false, reason: "unsupported", message: "Este navegador no soporta notificaciones." };
  }
  // En iOS las notificaciones SOLO funcionan si la app está instalada (standalone)
  if (isIOS() && !isStandalone()) {
    return {
      ok: false,
      reason: "ios-needs-install",
      message: "En iPhone primero debes INSTALAR la app (botón Compartir → 'Añadir a pantalla de inicio') para poder activar notificaciones."
    };
  }
  if (Notification.permission === "granted") return { ok: true, reason: "already-granted" };
  if (Notification.permission === "denied") {
    return {
      ok: false,
      reason: "denied",
      message: "Las notificaciones están BLOQUEADAS por el navegador.\n\nPara desbloquearlas:\n• Toca el candado/ícono al lado de la URL\n• Busca 'Notificaciones'\n• Cámbialo a 'Permitir'\n• Recarga la página"
    };
  }
  // Asegurar que el SW esté listo antes de pedir permiso
  await getReadySW();

  let result;
  try {
    // Algunos browsers viejos usan callback API
    result = await new Promise((resolve) => {
      const r = Notification.requestPermission(resolve);
      if (r && typeof r.then === "function") r.then(resolve);
    });
  } catch (e) {
    return { ok: false, reason: "error", message: "Error al pedir permiso: " + e.message };
  }

  if (result === "granted") return { ok: true, reason: "granted" };
  if (result === "denied")  return { ok: false, reason: "denied", message: "Permiso rechazado. Puedes intentarlo de nuevo desde el candado al lado de la URL." };
  return { ok: false, reason: "default", message: "No se concedió el permiso." };
}

function updateNotifStatusUI() {
  const el  = $("#notifStatus");
  const btn = $("#btnEnableNotif");
  if (!el || !btn) return;

  const perm = notifPermissionState();
  if (perm === "granted") {
    el.textContent = "Estado: ACTIVADAS ✓";
    el.className = "notif-status is-on";
    btn.textContent = "Activadas";
    btn.disabled = true;
  } else if (perm === "denied") {
    el.textContent = "Estado: bloqueadas por el navegador";
    el.className = "notif-status is-off";
    btn.textContent = "Cómo desbloquearlas";
    btn.disabled = false;
  } else if (perm === "unsupported") {
    el.textContent = "Estado: no soportadas aquí";
    el.className = "notif-status is-off";
    btn.disabled = true;
  } else if (isIOS() && !isStandalone()) {
    el.textContent = "Estado: instala la app primero";
    el.className = "notif-status is-off";
    btn.textContent = "¿Cómo instalar?";
    btn.disabled = false;
  } else {
    el.textContent = "Estado: desactivadas";
    el.className = "notif-status is-off";
    btn.textContent = "Activar notificaciones";
    btn.disabled = false;
  }
}

async function showSystemNotification(title, body, tag) {
  if (notifPermissionState() !== "granted") return false;

  const opts = {
    body,
    icon:  "/icon-192.png",
    badge: "/icon-192.png",
    tag:   tag || "pinata-notif",
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: false,
    renotify: true,
    data: { url: "/?source=pwa&action=admin" },
  };

  // Siempre preferir el Service Worker (requerido en Android/iOS)
  const reg = await getReadySW();
  if (reg) {
    try {
      await reg.showNotification(title, opts);
      return true;
    } catch (e) {
      console.warn("SW.showNotification falló, intento fallback:", e);
    }
  }
  // Fallback: API directa (sólo desktop)
  try {
    const n = new Notification(title, opts);
    n.onclick = () => {
      window.focus();
      if (state.step !== "admin") requestAdminAccess();
    };
    return true;
  } catch (e) {
    console.warn("Notification fallback falló:", e);
    return false;
  }
}

async function notifyNewOrder(orden) {
  showOrderToast(orden);
  playOrderChime();
  if (navigator.vibrate) {
    try { navigator.vibrate([200, 100, 200, 100, 200]); } catch (_) {}
  }
  if (notifPermissionState() !== "granted") return;

  const num     = orden.numero ? String(orden.numero).padStart(3, "0") : "?";
  const tipo    = orden.tipo === "estrella" ? "Estrella" : "Personalizada";
  const cliente = (orden.cliente && orden.cliente.nombre) ? ` · ${orden.cliente.nombre}` : "";

  await showSystemNotification(
    `Nueva orden #${num}`,
    `${tipo}${cliente}`,
    `orden-${orden.id}`
  );
}

/* ─── Toast in-app de nueva orden ─── */
let _toastTimer = null;
function showOrderToast(orden) {
  const toast = $("#orderToast");
  if (!toast) return;
  const num    = orden.numero ? String(orden.numero).padStart(3, "0") : "?";
  const tipo   = orden.tipo === "estrella" ? "Estrella" : "Personalizada";
  const cliente = (orden.cliente && orden.cliente.nombre) ? ` · ${orden.cliente.nombre}` : "";
  $("#orderToastTitle").textContent = `Nueva orden #${num}`;
  $("#orderToastBody").textContent  = `${tipo}${cliente}`;
  toast.hidden = false;
  toast.classList.add("is-visible");

  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => hideOrderToast(), 8000);

  $("#orderToastBtn").onclick = () => {
    hideOrderToast();
    if (state.step !== "admin") requestAdminAccess();
  };
}
function hideOrderToast() {
  const toast = $("#orderToast");
  if (!toast) return;
  toast.classList.remove("is-visible");
  setTimeout(() => { toast.hidden = true; }, 250);
}

/* ─── Sonido al llegar una orden (campanita) ─── */
let _audioCtx = null;
function playOrderChime() {
  try {
    if (!_audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      _audioCtx = new Ctx();
    }
    const ctx = _audioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    // Dos notas: do agudo + sol agudo (campanita alegre)
    [
      { freq: 1175, t: 0.00, dur: 0.18 },
      { freq: 1568, t: 0.18, dur: 0.30 },
    ].forEach(({ freq, t, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.25, now + t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + dur + 0.02);
    });
  } catch (e) { /* silencioso */ }
}

/* ─── Botones del modal de configuración (notif) ─── */
function initNotifControls() {
  const btn  = document.getElementById("btnEnableNotif");
  const test = document.getElementById("btnTestNotif");

  if (btn) {
    btn.addEventListener("click", async () => {
      // Caso especial: iOS sin instalar
      if (isIOS() && !isStandalone()) {
        alert(
          "📱 Para recibir notificaciones en iPhone:\n\n" +
          "1. Cierra este aviso\n" +
          "2. En Safari, toca el botón Compartir (cuadrado con flecha ↑)\n" +
          "3. Selecciona 'Añadir a pantalla de inicio'\n" +
          "4. Abre la app desde el ícono nuevo en tu pantalla\n" +
          "5. Vuelve a Ajustes → 'Activar notificaciones'\n\n" +
          "Esto es una restricción de Apple, no de la app."
        );
        return;
      }
      // Caso especial: ya bloqueadas
      if (notifPermissionState() === "denied") {
        const browserHint = navigator.userAgent.includes("Chrome")
          ? "Chrome/Edge: candado a la izquierda de la URL → Notificaciones → Permitir"
          : "Toca el candado o ícono al lado de la URL → Notificaciones → Permitir";
        alert(
          "🔒 Las notificaciones están bloqueadas.\n\n" +
          "Para desbloquearlas:\n" +
          browserHint + "\n\n" +
          "Después recarga la página y vuelve a intentar."
        );
        return;
      }

      const r = await requestNotificationPermission();
      updateNotifStatusUI();

      if (r.ok) {
        showToast("✅ Notificaciones activadas");
        // Notificación de prueba inmediata para confirmar que funciona
        setTimeout(async () => {
          const ok = await showSystemNotification(
            "🪅 ¡Listo!",
            "Aquí verás las nuevas órdenes",
            "test-welcome"
          );
          if (!ok) {
            alert("Las notificaciones se activaron pero hubo un problema mostrándolas. Prueba con el botón 'Probar notificación'.");
          }
        }, 400);
      } else if (r.message) {
        alert(r.message);
      }
    });
  }

  if (test) {
    test.addEventListener("click", async () => {
      // Si aún no hay permiso, pedirlo primero
      if (notifPermissionState() !== "granted") {
        if (isIOS() && !isStandalone()) {
          alert("Primero instala la app en tu iPhone para que las notificaciones funcionen (botón 'Compartir' → 'Añadir a pantalla de inicio').");
          return;
        }
        const r = await requestNotificationPermission();
        updateNotifStatusUI();
        if (!r.ok) {
          if (r.message) alert(r.message);
          return;
        }
      }

      // Disparar notificación con un dato realista
      const ok = await showSystemNotification(
        "Nueva orden #999",
        "Estrella · Prueba",
        "test-" + Date.now()
      );
      if (!ok) {
        alert(
          "No se pudo mostrar la notificación.\n\n" +
          "Posibles causas:\n" +
          "• El navegador no soporta notificaciones del sistema\n" +
          "• El sistema operativo bloquea notificaciones de este navegador\n" +
          "• En Windows, revisa: Configuración → Sistema → Notificaciones → habilitar para tu navegador\n" +
          "• En Android/iPhone, instala la app primero"
        );
      } else {
        // Toast in-app igual, por si la notif del sistema sale fuera de pantalla
        showToast("Notificación enviada");
      }
    });
  }
}

/* ============================================================
   Escape HTML helper
   ============================================================ */
function escapeHTML(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ============================================================
   Init
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  renderColorSwatches();
  applyColorsToSvg();
  updateProgress();
  initColorPicker();
  initModals();

  // Filtros del admin
  $$("#adminFilters .filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      $$("#adminFilters .filter-chip").forEach(c => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      adminFilter = chip.dataset.filter;
      renderAdmin();
    });
  });

  // Botones admin
  $("#btnAdmin").addEventListener("click", requestAdminAccess);
  $("#btnExitAdmin").addEventListener("click", () => {
    state.history = [];
    goTo("welcome", { pushHistory: false });
  });

  // Acceso por URL hash #admin
  if (location.hash === "#admin") {
    requestAdminAccess();
  }

  // Actualizar badge cuando cambie storage en otra pestaña (fallback sin nube)
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      _mem = loadLocalCache();
      renderAdmin();
    }
  });
  renderAdmin();

  // Conectar a la nube (si está configurada) — no bloquea la UI
  initCloud().catch(e => console.warn("Cloud init error:", e));

  // PWA: service worker + banner de instalación + controles de notificaciones
  registerServiceWorker();
  initInstallPrompt();
  initNotifControls();

  // Si la app abrió desde el shortcut "admin", entrar directo
  const params = new URLSearchParams(location.search);
  if (params.get("action") === "admin") requestAdminAccess();
});
