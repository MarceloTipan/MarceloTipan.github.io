import * as i18n from "./i18n.js";
import { startHero } from "./hero.js";
import { createCover } from "./covers.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const list = document.getElementById("project-list");
let projects = [];
const covers = new Map();   // project id -> cover controller

// Link order and label keys; links set to null in projects.json are skipped.
const LINKS = [
  ["play", "link.play"],
  ["download", "link.download"],
  ["itch", "link.itch"],
  ["paper", "link.paper"],
  ["code", "link.code"],
];

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

function projectText(project) {
  const text = el("div", { class: "project-text" });
  text.append(
    el("h3", { text: i18n.pick(project.title) }),
    el("p", { class: "project-when", text: i18n.pick(project.when) || "" }),
    el("p", { text: i18n.pick(project.summary) }),
  );

  const highlights = i18n.pick(project.highlights) || [];
  if (highlights.length) {
    text.append(el("ul", { class: "project-highlights" }, highlights.map((h) => el("li", { text: h }))));
  }
  if (project.stack?.length) {
    text.append(el("p", { class: "project-stack", text: `${i18n.t("stack")} ${project.stack.join(", ")}.` }));
  }

  const links = el("div", { class: "project-links" });
  let first = true;
  for (const [key, label] of LINKS) {
    const href = project.links?.[key];
    if (!href) continue;
    links.append(el("a", { href, class: first ? "button" : "", text: i18n.t(label) }));
    first = false;
  }
  text.append(links);
  return text;
}

// Texts are re-rendered on language change; the 3D covers are kept.
function renderTexts() {
  for (const project of projects) {
    const article = document.getElementById(`project-${project.id}`);
    article.querySelector(".project-text").replaceWith(projectText(project));
    article.querySelector(".project-cover").setAttribute("aria-label", i18n.pick(project.title));
  }
}

function renderProjects() {
  list.replaceChildren();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) covers.get(entry.target.dataset.id)?.setActive(entry.isIntersecting);
  }, { rootMargin: "100px" });

  for (const project of projects) {
    const canvas = el("canvas");
    const cover = el("div", { class: "project-cover", role: "img", "data-id": project.id }, [canvas]);
    const article = el("article", { class: "project", id: `project-${project.id}` }, [cover, el("div", { class: "project-text" })]);
    list.append(article);

    const controller = createCover(project.cover, canvas, { reducedMotion });
    if (controller) {
      covers.set(project.id, controller);
      observer.observe(cover);
    }
  }
  renderTexts();
}

async function loadProjects() {
  try {
    const response = await fetch("projects.json");
    if (!response.ok) throw new Error(response.statusText);
    projects = await response.json();
    renderProjects();
  } catch (error) {
    console.error("projects.json:", error);
    list.replaceChildren(el("p", { class: "empty", "data-i18n": "projects.error", text: i18n.t("projects.error") }));
  }
}

i18n.apply();
i18n.onChange(() => projects.length && renderTexts());
document.getElementById("lang-toggle").addEventListener("click", i18n.toggle);

try {
  startHero(document.getElementById("hero-field"), { reducedMotion });
} catch (error) {
  console.warn("Hero animation unavailable:", error);
}
loadProjects();
