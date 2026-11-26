// Page texts in English (default) and Spanish. The chosen language is
// remembered in this browser; project texts live in projects.json.

const STRINGS = {
  en: {
    "skip": "Skip to projects",
    "nav.projects": "Projects",
    "nav.about": "About",
    "nav.contact": "Contact",
    "hero.lede": "Software developer and computer graphics engineer. I build backend services for a living, and games and graphics that react to how you move.",
    "hero.hint": "Move your cursor, or your finger, through the field.",
    "projects.title": "Projects",
    "projects.loading": "Loading projects…",
    "projects.error": "The project list didn't load. Reload the page to try again.",
    "about.title": "About",
    "about.p1": "I'm a software developer based in Quito, Ecuador, working fully remote. Day to day I build and maintain backend services for a logistics company in Mexico, mostly in C# and .NET with RabbitMQ and PostgreSQL, and Python services with FastAPI.",
    "about.p2": "I studied Computer Graphics Engineering at Universidad Central del Ecuador. My thesis and a 2022 paper in Revista Odigos were about detecting body movement with computer vision to control a virtual reality application. That idea keeps coming back in my side projects: the game on this page can be played by moving a paddle in front of your webcam.",
    "about.backend": "Backend",
    "about.graphics": "Graphics and vision",
    "about.ai": "AI tooling",
    "about.delivery": "Delivery",
    "contact.title": "Contact",
    "contact.text": "Open to remote roles in backend development or graphics. The quickest way to reach me:",
    "footer": "Built by hand with three.js. Every cover on this page is a live 3D scene.",
    "link.play": "Play in your browser",
    "link.code": "Source code",
    "link.itch": "itch.io page",
    "link.download": "Download for Windows",
    "link.paper": "Read the paper",
    "stack": "Built with",
    "lang.button": "ES",
    "lang.label": "Ver en español",
  },
  es: {
    "skip": "Ir a los proyectos",
    "nav.projects": "Proyectos",
    "nav.about": "Sobre mí",
    "nav.contact": "Contacto",
    "hero.lede": "Desarrollador de software e ingeniero en computación gráfica. Construyo servicios backend en mi trabajo, y juegos y gráficos que reaccionan a cómo te mueves.",
    "hero.hint": "Pasa el cursor, o el dedo, por el campo de puntos.",
    "projects.title": "Proyectos",
    "projects.loading": "Cargando proyectos…",
    "projects.error": "La lista de proyectos no cargó. Recarga la página para intentarlo de nuevo.",
    "about.title": "Sobre mí",
    "about.p1": "Soy desarrollador de software en Quito, Ecuador, y trabajo de forma totalmente remota. En el día a día construyo y mantengo servicios backend para una empresa de logística de México, sobre todo en C# y .NET con RabbitMQ y PostgreSQL, y servicios en Python con FastAPI.",
    "about.p2": "Estudié Ingeniería en Computación Gráfica en la Universidad Central del Ecuador. Mi tesis y un artículo de 2022 en la Revista Odigos trataron sobre detectar el movimiento del cuerpo con visión por computadora para controlar una aplicación de realidad virtual. Esa idea vuelve en mis proyectos personales: el juego de esta página se puede jugar moviendo una paleta frente a la cámara web.",
    "about.backend": "Backend",
    "about.graphics": "Gráficos y visión",
    "about.ai": "Herramientas de IA",
    "about.delivery": "Entrega",
    "contact.title": "Contacto",
    "contact.text": "Abierto a trabajos remotos en desarrollo backend o gráficos. La forma más rápida de contactarme:",
    "footer": "Hecho a mano con three.js. Cada portada de esta página es una escena 3D en vivo.",
    "link.play": "Jugar en el navegador",
    "link.code": "Código fuente",
    "link.itch": "Página en itch.io",
    "link.download": "Descargar para Windows",
    "link.paper": "Leer el artículo",
    "stack": "Hecho con",
    "lang.button": "EN",
    "lang.label": "View in English",
  },
};

const STORAGE_KEY = "portfolio-lang";
const listeners = [];

function readSaved() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved in STRINGS ? saved : null;
  } catch {
    return null;
  }
}

let current = readSaved() || "en";

export function lang() {
  return current;
}

export function t(key) {
  return STRINGS[current][key] ?? STRINGS.en[key] ?? key;
}

/** Pick the current language's value from a {en, es} object (projects.json). */
export function pick(value) {
  if (value == null || typeof value === "string") return value;
  return value[current] ?? value.en;
}

export function onChange(callback) {
  listeners.push(callback);
}

export function apply() {
  document.documentElement.lang = current;
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  const toggle = document.getElementById("lang-toggle");
  if (toggle) {
    toggle.textContent = t("lang.button");
    toggle.setAttribute("aria-label", t("lang.label"));
  }
}

export function setLang(next) {
  if (!(next in STRINGS) || next === current) return;
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private mode or blocked storage: the choice just won't be remembered.
  }
  apply();
  listeners.forEach((callback) => callback(current));
}

export function toggle() {
  setLang(current === "en" ? "es" : "en");
}
