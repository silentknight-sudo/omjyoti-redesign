import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import Lenis from "lenis";
import { createPump } from "./pump3d.js";
import { createShowcase, SHOW_META, STEP_WINDOWS } from "./showcase3d.js";
import PRODUCTS from "./products.json";

gsap.registerPlugin(ScrollTrigger, Flip);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const isMobile = () => window.innerWidth < 861;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

document.body.classList.add("is-loading");
$("#year").textContent = new Date().getFullYear();

/* ------------------------------------------------------------------ */
/* Smooth scroll                                                       */
/* ------------------------------------------------------------------ */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ duration: 1.7, smoothWheel: true, wheelMultiplier: 0.7 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const velocity = () => (lenis ? lenis.velocity : 0);
function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.6 });
  else window.scrollTo({ top: target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY, behavior: "smooth" });
}

/* ------------------------------------------------------------------ */
/* Odometer: rolling digit wheels, like a water meter                  */
/* ------------------------------------------------------------------ */
function buildOdo(el) {
  const n = +el.dataset.digits || 2;
  el.innerHTML = Array.from({ length: n }, () =>
    `<span class="odo__d"><span>${Array.from({ length: 10 }, (_, d) => `<i>${d}</i>`).join("")}</span></span>`).join("") +
    (el.dataset.suffix ? `<span class="odo__s">${el.dataset.suffix}</span>` : "");
  el.setAttribute("aria-label", (el.dataset.value || "") + (el.dataset.suffix || ""));
}
function rollOdo(el, value, { duration = 1.8, stagger = 0.12 } = {}) {
  const cols = $$(".odo__d > span", el);
  const str = String(Math.round(value)).padStart(cols.length, "0").slice(-cols.length);
  cols.forEach((c, i) => {
    const d = +str[i];
    // leading wheels spin extra turns for a mechanical feel
    gsap.to(c, { yPercent: -d * 10, duration: duration + (cols.length - i) * stagger, ease: "power3.inOut" });
  });
}
$$(".odo").forEach(buildOdo);

/* ------------------------------------------------------------------ */
/* Hero: pump set                                                      */
/* ------------------------------------------------------------------ */
const labels = Object.fromEntries($$(".callout").map((el) => [el.dataset.part, el]));
let pump = null;
try {
  pump = createPump($("#pumpGl"), { mobile: isMobile(), labels });
} catch (err) {
  console.warn("WebGL unavailable; the hero shows without the 3D pump", err);
}
const heroStage = $(".hero__stage");
heroStage.addEventListener("pointermove", (e) => {
  if (pump) pump.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
});

gsap.set(".hero__title .ln > span, .hero__last span", { yPercent: 110 });
gsap.set(".eyebrow, .hero__sub, .hero__cta", { autoAlpha: 0, y: 24 });
gsap.set(".hero__big span", { yPercent: 40, autoAlpha: 0 });

const heroTl = gsap.timeline({ paused: true, defaults: { ease: "none" } })
  .to(".hero__intro", { autoAlpha: 0, y: -70, duration: 0.1 }, 0.02)
  .to(".hero__scroll", { autoAlpha: 0, duration: 0.05 }, 0)
  .fromTo(".hero__phase--anatomy", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.22)
  .to(".hero__phase--anatomy", { autoAlpha: 0, y: -30, duration: 0.06 }, 0.48)
  .set(".hero__phase--flow", { autoAlpha: 1 }, 0.7)
  .to(".hero__big span", { yPercent: 0, autoAlpha: 1, stagger: 0.04, duration: 0.08 }, 0.72);
const heroSteps = $$(".hero__steps li");
ScrollTrigger.create({
  trigger: ".hero",
  start: "top top",
  end: () => `+=${window.innerHeight * (isMobile() ? 4.2 : 5.2)}`,
  pin: heroStage,
  anticipatePin: 1,
  onUpdate(self) {
    const p = self.progress;
    if (pump) pump.setProgress(p);
    heroTl.progress(p);
    const idx = p < 0.18 ? 0 : p < 0.56 ? 1 : 2;
    heroSteps.forEach((li, i) => li.classList.toggle("is-on", i === idx));
  },
});
ScrollTrigger.create({ trigger: ".hero", start: "top bottom", end: "bottom top", onToggle: (s) => pump && pump.setVisible(s.isActive) });

/* ------------------------------------------------------------------ */
/* Loader                                                              */
/* ------------------------------------------------------------------ */
function runLoader() {
  const odo = $("#loaderOdo");
  rollOdo(odo, 0, { duration: 0 });
  const ready = Promise.all([
    document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve(),
    new Promise((r) => (document.readyState === "complete" ? r() : window.addEventListener("load", r, { once: true }))),
  ]);
  gsap.to("#loaderBar", { scaleX: 0.7, duration: 1.4, ease: "power2.out" });
  rollOdo(odo, 70, { duration: 1.2, stagger: 0.1 });
  Promise.race([ready, new Promise((r) => setTimeout(r, 4500))]).then(() => {
    rollOdo(odo, 100, { duration: 0.9, stagger: 0.08 });
    const intro = { v: 0 };
    gsap.timeline({ delay: reduced ? 0 : 1.1 })
      .to("#loaderBar", { scaleX: 1, duration: 0.4, ease: "power2.out" }, 0)
      .to("#loader", { yPercent: -100, duration: reduced ? 0.2 : 1.1, ease: "expo.inOut" })
      .add(() => {
        $("#loader").style.display = "none";
        document.body.classList.remove("is-loading");
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      })
      .to(intro, { v: 1, duration: 2, ease: "expo.out", onUpdate: () => pump && pump.setIntro(intro.v) }, "-=0.6")
      .to(".hero__title .ln > span, .hero__last span", { yPercent: 0, duration: 1.3, stagger: 0.1, ease: "expo.out" }, "<")
      .to(".eyebrow, .hero__sub, .hero__cta", { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease: "power3.out" }, "<0.25");
  });
}

/* ------------------------------------------------------------------ */
/* Nav, menu, anchors                                                  */
/* ------------------------------------------------------------------ */
const nav = $("#nav"), burger = $("#burger"), menu = $("#menu");
function toggleMenu(open) {
  menu.classList.toggle("is-open", open);
  burger.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-hidden", String(!open));
  if (lenis) open ? lenis.stop() : lenis.start();
}
burger.addEventListener("click", () => toggleMenu(!menu.classList.contains("is-open")));
$$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
  const id = a.getAttribute("href");
  const target = id === "#top" ? 0 : $(id);
  if (target === null) return;
  e.preventDefault();
  if (menu.classList.contains("is-open")) toggleMenu(false);
  scrollToTarget(target);
}));
let lastY = 0;
gsap.ticker.add(() => {
  const y = lenis ? lenis.scroll : window.scrollY;
  nav.classList.toggle("is-scrolled", y > 40);
  if (y > lastY + 2 && y > 500 && !menu.classList.contains("is-open")) nav.classList.add("is-hidden");
  else if (y < lastY - 2) nav.classList.remove("is-hidden");
  lastY = y;
});
const navLinks = $$(".nav__links a");
navLinks.forEach((a) => {
  const sec = $(a.getAttribute("href"));
  ScrollTrigger.create({ trigger: sec, start: "top 50%", end: "bottom 50%", onToggle: (s) => a.classList.toggle("is-active", s.isActive) });
});

/* buttons: hover fill grows from the pointer */
$$(".btn").forEach((b) => b.addEventListener("pointermove", (e) => {
  const r = b.getBoundingClientRect();
  b.style.setProperty("--bx", `${e.clientX - r.left}px`);
  b.style.setProperty("--by", `${e.clientY - r.top}px`);
}));

/* ------------------------------------------------------------------ */
/* Ticker driven by time + scroll velocity                             */
/* ------------------------------------------------------------------ */
const ticker = $("#ticker");
ticker.innerHTML += ticker.innerHTML;
let tX = 0, tSkew = 0;
gsap.ticker.add((_, dt) => {
  const v = velocity();
  const half = ticker.scrollWidth / 2;
  tX -= (0.03 + Math.abs(v) * 0.03) * dt * (v < 0 ? -1 : 1);
  if (tX <= -half) tX += half;
  if (tX > 0) tX -= half;
  tSkew += (clamp(-v * 0.3, -14, 14) - tSkew) * 0.12;
  ticker.style.transform = `translate3d(${tX}px,0,0) skewX(${tSkew}deg)`;
});

/* ------------------------------------------------------------------ */
/* Headline word reveals                                               */
/* ------------------------------------------------------------------ */
function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute("aria-label", el.textContent.trim());
  el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true"><span>${w}</span></span>`).join(" ");
  return $$(".w > span", el);
}
$$(".split").forEach((el) => {
  gsap.from(splitWords(el), {
    yPercent: 115, rotate: 5, duration: 1.2, stagger: 0.05, ease: "expo.out",
    scrollTrigger: { trigger: el, start: "top 86%" },
  });
});
// About statement: words light up as you read
const stWords = splitWords($("#statement"));
gsap.fromTo(stWords, { opacity: 0.14 }, {
  opacity: 1, stagger: 0.1, ease: "none",
  scrollTrigger: { trigger: "#statement", start: "top 78%", end: "bottom 42%", scrub: true },
});
gsap.from(".about__copy p, .brands", {
  y: 40, autoAlpha: 0, stagger: 0.1, duration: 1, ease: "power3.out",
  scrollTrigger: { trigger: ".about", start: "top 80%" },
});
$$(".meters .odo").forEach((el) => {
  rollOdo(el, 0, { duration: 0 });
  ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => rollOdo(el, +el.dataset.value, { duration: 2, stagger: 0.25 }) });
});
gsap.from(".meter", {
  y: 50, autoAlpha: 0, stagger: 0.08, duration: 1, ease: "expo.out",
  scrollTrigger: { trigger: ".meters", start: "top 85%" },
});

/* ------------------------------------------------------------------ */
/* Solutions: stacking cards                                           */
/* ------------------------------------------------------------------ */
const scards = $$(".scard");
scards.forEach((card, i) => {
  card.style.setProperty("--i", i);
  const img = $(".scard__media img", card);
  gsap.fromTo(img, { yPercent: 10, scale: 1.12 }, {
    yPercent: -6, scale: 1, ease: "none",
    scrollTrigger: { trigger: card, start: "top bottom", end: "top 20%", scrub: true },
  });
  const next = scards[i + 1];
  if (next) {
    gsap.to(card, {
      scale: 0.9, "--dim": 0.55, ease: "none",
      scrollTrigger: { trigger: next, start: "top bottom", end: () => `top ${96 + (i + 1) * 16}px`, scrub: true },
    });
  }
  gsap.from($$(".scard__body > *", card), {
    y: 30, autoAlpha: 0, stagger: 0.06, duration: 0.9, ease: "power3.out",
    scrollTrigger: { trigger: card, start: "top 70%" },
  });
});

/* ------------------------------------------------------------------ */
/* Products: filter + 3D reveal + modal                                */
/* ------------------------------------------------------------------ */
const prods = $$(".prod");
gsap.set(prods, { autoAlpha: 0, y: 70, rotateX: -22, transformPerspective: 1200, transformOrigin: "50% 100%" });
ScrollTrigger.batch(prods, {
  start: "top 92%", once: true,
  onEnter: (b) => gsap.to(b, { autoAlpha: 1, y: 0, rotateX: 0, stagger: 0.07, duration: 1.1, ease: "expo.out", clearProps: "transform" }),
});
function applyFilter(f) {
  $$(".chip").forEach((c) => c.classList.toggle("is-on", c.dataset.filter === f));
  const state = Flip.getState(prods);
  prods.forEach((s) => { s.hidden = f !== "all" && s.dataset.cat !== f; gsap.set(s, { autoAlpha: 1, y: 0, rotateX: 0 }); });
  Flip.from(state, {
    duration: 0.7, ease: "power3.inOut", stagger: 0.015, absolute: true, scale: true,
    onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "power3.out" }),
    onLeave: (els) => gsap.to(els, { autoAlpha: 0, scale: 0.85, duration: 0.35 }),
    onComplete: () => ScrollTrigger.refresh(),
  });
}
$$(".chip").forEach((chip) => chip.addEventListener("click", () => applyFilter(chip.dataset.filter)));
$$("[data-goto]").forEach((a) => a.addEventListener("click", () => setTimeout(() => applyFilter(a.dataset.goto), 900)));

const modal = $("#modal");
let lastFocus = null;
function renderBlocks(blocks) {
  return blocks.map((lines, bi) => {
    const isList = lines.length > 2 && lines.slice(1).every((l) => l.length < 110);
    if (isList) {
      const head = /[:?]$|^[A-Z][^.]{0,60}$/.test(lines[0]) ? `<p class="lead">${esc(lines[0])}</p>` : "";
      const items = head ? lines.slice(1) : lines;
      return head + `<ul>${items.map((l) => `<li>${esc(l.replace(/^[-•\d.)\s]+/, ""))}</li>`).join("")}</ul>`;
    }
    return lines.map((l, li) => {
      const lead = (bi === 0 && li === 0) || (l.length < 70 && !/[.]$/.test(l));
      return `<p${lead ? ' class="lead"' : ""}>${esc(l)}</p>`;
    }).join("");
  }).join("");
}
function openModal(slug) {
  const p = PRODUCTS.find((x) => x.slug === slug);
  if (!p) return;
  lastFocus = document.activeElement;
  $("#modalImg").src = p.img;
  $("#modalImg").alt = p.name;
  $("#modalCat").textContent = p.category;
  $("#modalTitle").textContent = p.name;
  $("#modalDesc").innerHTML = renderBlocks(p.blocks);
  $("#modalLink").href = p.url;
  $("#modalEnquire").dataset.name = p.name;
  modal.hidden = false;
  $(".modal__body", modal).scrollTop = 0;
  if (lenis) lenis.stop();
  gsap.fromTo(".modal__backdrop", { opacity: 0 }, { opacity: 1, duration: 0.4 });
  gsap.fromTo(".modal__panel", { y: 80, scale: 0.94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.8, ease: "expo.out", clearProps: "transform" });
  $(".modal__close", modal).focus();
}
function closeModal() {
  if (modal.hidden) return;
  gsap.to(".modal__panel", { y: 40, opacity: 0, duration: 0.3, ease: "power2.in" });
  gsap.to(".modal__backdrop", {
    opacity: 0, duration: 0.3,
    onComplete: () => { modal.hidden = true; if (lenis) lenis.start(); if (lastFocus) lastFocus.focus(); },
  });
}
prods.forEach((c) => c.addEventListener("click", () => openModal(c.dataset.slug)));
$$("[data-close]", modal).forEach((el) => el.addEventListener("click", closeModal));
$("#modalEnquire").addEventListener("click", (e) => {
  const name = e.currentTarget.dataset.name;
  const sel = $("#needSelect");
  if (![...sel.options].some((o) => o.value === name)) sel.add(new Option(name, name), 0);
  sel.value = name;
  closeModal();
  setTimeout(() => scrollToTarget($("#contact")), 350);
});

/* ------------------------------------------------------------------ */
/* Products in 3D: six systems, each a four-step story                  */
/* ------------------------------------------------------------------ */
const SHOW_N = SHOW_META.length;
$("#showTabs").innerHTML = SHOW_META.map((m, i) =>
  `<button type="button" class="show__tab${i === 0 ? " is-on" : ""}" data-i="${i}"><b>${String(i + 1).padStart(2, "0")}</b>${esc(m.name)}</button>`).join("");
$("#showPanels").innerHTML = SHOW_META.map((m, i) => `
  <article class="show__panel${i === 0 ? " is-on" : ""}">
    <p class="show__cat">${esc(m.cat)}</p>
    <h3>${esc(m.name)}</h3>
    <p>${esc(m.summary)}</p>
    <ol class="show__steps">${m.steps.map((st, k) => `<li><b>${k + 1}</b><span>${esc(st)}</span><i></i></li>`).join("")}</ol>
    <button type="button" class="link" data-slug="${m.slug}">Open datasheet →</button>
  </article>`).join("");
$("#showOf").textContent = `/ ${String(SHOW_N).padStart(2, "0")}`;

let show = null;
try {
  show = createShowcase($("#showGl"), { mobile: isMobile(), labelLayer: $("#showLabels") });
} catch (err) {
  console.warn("WebGL unavailable; the 3D product showcase is skipped", err);
}
const showTabs = $$(".show__tab"), showPanels = $$(".show__panel");
let showIdx = 0;
function showProduct(i) {
  if (i === showIdx) return;
  const dir = i > showIdx ? 1 : -1;
  const out = showPanels[showIdx], inn = showPanels[i];
  gsap.to(out, { autoAlpha: 0, y: -30 * dir, duration: 0.35, ease: "power2.in", onComplete: () => out.classList.remove("is-on") });
  inn.classList.add("is-on");
  gsap.fromTo(inn, { autoAlpha: 0, y: 40 * dir }, { autoAlpha: 1, y: 0, duration: 0.7, delay: 0.2, ease: "expo.out" });
  gsap.fromTo($$("h3, p, li, .link", inn), { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.05, duration: 0.6, delay: 0.25, ease: "power3.out" });
  showTabs.forEach((b, k) => b.classList.toggle("is-on", k === i));
  $("#showNo").textContent = String(i + 1).padStart(2, "0");
  showIdx = i;
}
// highlight the story step that is playing, with a fill bar per step
function showSteps(i, local) {
  $$(".show__steps li", showPanels[i]).forEach((li, k) => {
    const [a, b] = STEP_WINDOWS[k];
    const f = clamp((local - a) / (b - a), 0, 1);
    li.classList.toggle("is-on", local >= a && local < b);
    li.classList.toggle("is-done", local >= b);
    li.style.setProperty("--f", f.toFixed(3));
  });
}
const showST = ScrollTrigger.create({
  trigger: ".show__pin",
  start: "top top",
  end: () => `+=${window.innerHeight * SHOW_N * 3}`,
  pin: true,
  anticipatePin: 1,
  onUpdate(self) {
    if (show) show.setProgress(self.progress);
    $("#showBar").style.transform = `scaleX(${self.progress})`;
    const seg = Math.min(SHOW_N - 0.0001, self.progress * SHOW_N);
    const i = Math.floor(seg);
    showProduct(i);
    showSteps(i, seg - i);
  },
});
ScrollTrigger.create({ trigger: "#in3d", start: "top bottom", end: "bottom top", onToggle: (s) => show && show.setVisible(s.isActive) });
showTabs.forEach((b, i) => b.addEventListener("click", () => {
  const y = showST.start + (showST.end - showST.start) * ((i + 0.3) / SHOW_N);
  if (lenis) lenis.scrollTo(y, { duration: 1.6 }); else window.scrollTo({ top: y, behavior: "smooth" });
}));
$$(".show__panel .link").forEach((b) => b.addEventListener("click", () => openModal(b.dataset.slug)));

/* ------------------------------------------------------------------ */
/* RO process: pinned list + water-level image wipe                    */
/* ------------------------------------------------------------------ */
const STEPS = [
  ["Raw Water Tank", "Raw water from a borewell or municipal supply is collected and stored."],
  ["Raw Water Pump", "Transfers water from the raw water tank to the treatment system."],
  ["Multi Grade Sand Filter", "Cleaner water starts here. MGF removes impurities."],
  ["Activated Carbon Filter", "Better taste. Odour-free water. Premium quality."],
  ["Dosing System", "Antiscalant and chemical dosing for optimal protection."],
  ["Cartridge Filter", "Stronger protection and longer life for your RO system."],
  ["High Pressure Pump", "High pressure. High performance. Powering pure water."],
  ["Reverse Osmosis System", "Pure water. Pure life. Pure performance."],
  ["Pure Water Tank", "Safe storage. Consistent supply."],
  ["Distribution / Usage Point", "Purified water delivered to where you need it."],
  ["System Control & Monitoring", "Intelligent control. Real-time monitoring."],
  ["Maintenance & Support", "Regular maintenance. Timely support. Long life."],
  ["Startup & Commissioning", "Verified and validated, ready to deliver purified water."],
  ["Documentation & Handover", "Complete documentation. Reliable performance for years."],
  ["Completed RO Plant", "Ready to perform, every day."],
];
const STEP_IMAGES = [
  "assets/images/gallery/g08.jpg",
  "assets/images/gallery/g09.jpg",
  "assets/images/gallery/g10.jpg",
  "assets/images/gallery/g11.jpg",
  "assets/images/gallery/g12.jpg",
  "assets/images/gallery/g13.jpg",
  "assets/images/gallery/g14.jpg",
  "assets/images/gallery/g15.jpg",
  "assets/images/gallery/g16.jpg",
  "assets/images/gallery/g17.jpg",
  "assets/images/gallery/g18.jpg",
  "assets/images/gallery/g19.jpg",
  "assets/images/gallery/g20.jpg",
  "assets/images/gallery/g21.jpg",
  "assets/images/gallery/g22.jpg",
];
const frame = $("#procFrame"), list = $("#procList");
STEPS.forEach(([title], i) => {
  frame.insertAdjacentHTML("afterbegin", `<img src="${STEP_IMAGES[i]}" alt="Step ${i + 1}: ${esc(title)}" loading="lazy" decoding="async" style="z-index:${i + 1}" />`);
  list.insertAdjacentHTML("beforeend", `<li><b>${String(i + 1).padStart(2, "0")}</b>${esc(title)}</li>`);
});
const frames = $$("img", frame).reverse(), items = $$("li", list);
let curStep = -1;
function showStep(i) {
  if (i === curStep) return;
  frames.forEach((img, k) => {
    if (k < i && k !== curStep) gsap.set(img, { clipPath: "inset(0% 0 0 0)", scale: 1 });
    if (k > i) gsap.to(img, { clipPath: "inset(100% 0 0 0)", duration: 0.5, ease: "power3.inOut", overwrite: true });
  });
  gsap.fromTo(frames[i], { clipPath: "inset(100% 0 0 0)", scale: 1.15 }, { clipPath: "inset(0% 0 0 0)", scale: 1, duration: 0.9, ease: "expo.out", overwrite: true });
  items.forEach((li, k) => { li.classList.toggle("is-on", k === i); li.classList.toggle("is-done", k < i); });
  const rowH = items[0].offsetHeight + 1;
  gsap.to(list, { y: -Math.max(0, i - 5) * rowH, duration: 0.6, ease: "power3.out" });
  $("#procNo").textContent = String(i + 1).padStart(2, "0");
  const cap = $("#procCap");
  gsap.fromTo(cap, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" });
  cap.textContent = `${STEPS[i][0]}: ${STEPS[i][1]}`;
  curStep = i;
}
showStep(0);
ScrollTrigger.create({
  trigger: ".process__pin",
  start: "top top",
  end: () => `+=${window.innerHeight * STEPS.length * 0.5}`,
  pin: true,
  anticipatePin: 1,
  onUpdate(self) {
    $("#procRail").style.transform = `scaleY(${self.progress})`;
    showStep(clamp(Math.floor(self.progress * STEPS.length), 0, STEPS.length - 1));
  },
});

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */
gsap.from(".svc li", {
  y: 50, autoAlpha: 0, stagger: 0.08, duration: 1, ease: "expo.out",
  scrollTrigger: { trigger: ".svc", start: "top 82%" },
});

/* ------------------------------------------------------------------ */
/* Gallery: 3D wall, rows slide against each other                     */
/* ------------------------------------------------------------------ */
$$(".wall__row").forEach((row) => {
  const dir = +row.dataset.speed;
  gsap.fromTo(row, { x: dir > 0 ? -420 : 0 }, {
    x: dir > 0 ? 0 : -420, ease: "none",
    scrollTrigger: { trigger: "#wall", start: "top bottom", end: "bottom top", scrub: 0.6 },
  });
});
gsap.fromTo(".wall__plane", { rotateX: 38, rotateZ: -14, scale: 0.92 }, {
  rotateX: 14, rotateZ: -6, scale: 1.05, ease: "none",
  scrollTrigger: { trigger: "#wall", start: "top bottom", end: "bottom top", scrub: true },
});
const lightbox = $("#lightbox");
$$(".tile").forEach((el) => el.addEventListener("click", () => {
  $("#lightboxImg").src = el.dataset.full;
  $("#lightboxImg").alt = $("img", el).alt;
  lightbox.hidden = false;
  if (lenis) lenis.stop();
  gsap.fromTo("#lightboxImg", { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "expo.out" });
}));
function closeLightbox() { lightbox.hidden = true; if (lenis) lenis.start(); }
lightbox.addEventListener("click", closeLightbox);
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!lightbox.hidden) closeLightbox();
  closeModal();
});

/* ------------------------------------------------------------------ */
/* Areas + contact headline + footer word                              */
/* ------------------------------------------------------------------ */
gsap.from(".cities li", {
  x: 60, autoAlpha: 0, stagger: 0.06, duration: 0.9, ease: "expo.out",
  scrollTrigger: { trigger: ".cities", start: "top 82%" },
});
const mega = $("#mega");
mega.setAttribute("aria-label", mega.textContent);
mega.innerHTML = mega.textContent.split(" ").map((w) =>
  `<span class="wd" aria-hidden="true">${[...w].map((c) => `<span class="ch">${c}</span>`).join("")}</span>`).join(" ");
gsap.from($$(".ch", mega), {
  yPercent: 100, rotateX: -90, autoAlpha: 0, transformPerspective: 600, transformOrigin: "50% 100%",
  stagger: 0.035, duration: 1, ease: "expo.out",
  scrollTrigger: { trigger: mega, start: "top 85%" },
});
// size the footer wordmark to exactly fill the content width
const footWord = $("#footWord");
function fitFootWord() {
  footWord.style.fontSize = "";
  const base = parseFloat(getComputedStyle(footWord).fontSize);
  footWord.style.fontSize = `${Math.floor(base * (footWord.clientWidth / footWord.scrollWidth) * 0.99)}px`;
}
fitFootWord();
window.addEventListener("resize", fitFootWord);
if (document.fonts) document.fonts.ready.then(fitFootWord);
gsap.fromTo("#footWord", { backgroundPosition: "0% 0%" }, {
  backgroundPosition: "0% 100%", ease: "none",
  scrollTrigger: { trigger: "#footWord", start: "top bottom", end: "bottom 85%", scrub: true },
});

/* ------------------------------------------------------------------ */
/* Cursor with contextual labels                                       */
/* ------------------------------------------------------------------ */
if (finePointer && !reduced) {
  const cursor = $(".cursor"), dot = $(".cursor__dot"), ring = $(".cursor__ring"), label = $("#cursorLabel");
  const dx = gsap.quickTo(dot, "x", { duration: 0.08 }), dy = gsap.quickTo(dot, "y", { duration: 0.08 });
  const rx = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" });
  window.addEventListener("pointermove", (e) => { cursor.classList.add("is-on"); dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
  document.addEventListener("pointerover", (e) => {
    const tagged = e.target.closest(".prod, .tile");
    cursor.classList.toggle("is-label", !!tagged);
    label.textContent = tagged ? (tagged.classList.contains("tile") ? "View" : "Open") : "";
    cursor.classList.toggle("is-hover", !tagged && !!e.target.closest("a, button, input, select, textarea"));
  });
}

/* ------------------------------------------------------------------ */
/* Enquiry form → WhatsApp / email                                     */
/* ------------------------------------------------------------------ */
const form = $("#enquiry"), msg = $("#formMsg");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const via = (e.submitter && e.submitter.dataset.via) || "whatsapp";
  const data = Object.fromEntries(new FormData(form));
  let ok = true;
  ["name", "phone"].forEach((n) => {
    const field = form.elements[n];
    const bad = !field.value.trim() || (n === "phone" && field.value.replace(/\D/g, "").length < 8);
    field.classList.toggle("is-invalid", bad);
    if (bad) ok = false;
  });
  if (!ok) { msg.textContent = "Please enter your name and a valid phone number."; return; }
  const text = `Enquiry from website\nName: ${data.name}\nPhone: ${data.phone}\nRequirement: ${data.need}\n${data.msg ? "Message: " + data.msg : ""}`;
  // a real link always works; opening it automatically is only a convenience
  const href = via === "email"
    ? `mailto:omjyotientp@gmail.com?subject=${encodeURIComponent("Enquiry: " + data.need)}&body=${encodeURIComponent(text)}`
    : `https://wa.me/919910109627?text=${encodeURIComponent(text)}`;
  const label = via === "email" ? "Open email (omjyotientp@gmail.com)" : "Open WhatsApp (+91 99101 09627)";
  msg.innerHTML = `Your message is ready. <a href="${href}" target="_blank" rel="noopener">${label} →</a>`;
  if (via !== "email") window.open(href, "_blank", "noopener");
});

window.addEventListener("load", () => ScrollTrigger.refresh());
runLoader();
