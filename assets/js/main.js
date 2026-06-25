/* =========================================================================
   BNA cleaning, site engine
   Lenis smooth scroll · reveals · counters · nav · cinematic scrub
   ========================================================================= */

/* ---------- mobile nav + scrolled state ---------- */
(function () {
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      links.classList.toggle("open");
      toggle.classList.toggle("open");
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        links.classList.remove("open");
        toggle.classList.remove("open");
      })
    );
  }
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 30);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
})();

/* ---------- counters ---------- */
function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || "";
  const dur = 1600, t0 = performance.now();
  function step(t) {
    const k = Math.min((t - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - k, 3);
    const val = target % 1 === 0 ? Math.round(target * eased) : (target * eased).toFixed(1);
    el.textContent = val + suffix;
    if (k < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- cinematic scrub engine (4 diensten, dwell + acceleratie) ---------- */
function initCinematic() {
  const section = document.querySelector(".cinematic");
  if (!section) return null;
  const canvas = section.querySelector("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const cfg = window.CINEMATIC || {};
  const N = cfg.frameCount || 220;
  const bg = cfg.bg || "#0c1322";
  // dwell ranges per service (frame numbers, 1-based)
  const segs = cfg.segments || [
    { dwell: [1, 42] }, { dwell: [52, 110] },
    { dwell: [126, 174] }, { dwell: [188, N] },
  ];
  const panels = [...section.querySelectorAll(".cin-panel")];
  const fill = section.querySelector(".cin-progress .fill");
  const images = [];
  let firstDrawn = false;
  for (let i = 0; i < N; i++) {
    const img = new Image();
    img.src = cfg.framePath(i + 1);
    img.onload = () => { if (!firstDrawn) { firstDrawn = true; draw(1); } };
    images[i] = img;
  }
  let current = -1;
  function draw(frame) {
    const img = images[Math.max(0, Math.min(N - 1, frame - 1))];
    if (!img || !img.complete || !img.naturalWidth) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
    let dw, dh, dx, dy;
    if (ir > cr) { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0; }
    else { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(current < 0 ? 1 : current);
  }
  const DWELL = 0.6; // share of each segment spent lingering on the service
  function update() {
    const rect = section.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const scrollable = rect.height - window.innerHeight;
    const p = Math.min(Math.max(-rect.top / scrollable, 0), 1);
    if (fill) fill.style.width = (p * 100).toFixed(2) + "%";

    const t = p * segs.length;
    let seg = Math.floor(t);
    if (seg >= segs.length) seg = segs.length - 1;
    const local = t - seg;
    const d = segs[seg].dwell;
    const nextStart = seg < segs.length - 1 ? segs[seg + 1].dwell[0] : N;
    let frame;
    if (local < DWELL) {
      // linger: slowly play this service's own footage
      frame = d[0] + (d[1] - d[0]) * (local / DWELL);
    } else {
      // accelerate hard toward the next service
      frame = d[1] + (nextStart - d[1]) * ((local - DWELL) / (1 - DWELL));
    }
    frame = Math.round(frame);
    if (frame !== current) { current = frame; draw(frame); }

    // active panel = current segment, fade out during the rush
    panels.forEach((panel, i) => {
      const on = i === seg && local < DWELL + 0.06;
      panel.classList.toggle("active", on);
    });
  }
  window.addEventListener("resize", resize);
  resize();
  return { update };
}

/* ---------- parallax (foto's bewegen mee op scroll) ---------- */
function setupParallax() {
  const els = [...document.querySelectorAll("[data-parallax]")].map((el) => ({
    el, speed: parseFloat(el.dataset.parallax) || 0.12,
  }));
  const vh = () => window.innerHeight;
  function update() {
    const center = vh() / 2;
    for (const { el, speed } of els) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh() + 200) continue;
      const ec = r.top + r.height / 2;
      const off = (center - ec) * speed;
      el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
    }
  }
  return { update };
}

/* ---------- 3D tilt op hover ---------- */
function setupTilt() {
  const sel = "[data-tilt], .card, .usp, .quote, .step";
  document.querySelectorAll(sel).forEach((el) => {
    const max = parseFloat(el.dataset.tiltMax) || 7;
    el.style.transformStyle = "preserve-3d";
    el.classList.add("tiltable");
    el.addEventListener("pointermove", (e) => {
      if (window.matchMedia("(pointer:coarse)").matches) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-6px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}

/* ---------- masonry galerij (grid i.p.v. multicol → transforms flikkeren niet) ---------- */
function layoutMasonry() {
  document.querySelectorAll(".gallery").forEach((g) => {
    const cs = getComputedStyle(g);
    const rowH = parseFloat(cs.gridAutoRows) || 8;
    const gap = parseFloat(cs.rowGap) || 20;
    g.querySelectorAll(".ph").forEach((ph) => {
      ph.style.gridRowEnd = "auto";
      const h = ph.getBoundingClientRect().height;
      const span = Math.max(1, Math.round((h + gap) / (rowH + gap)));
      ph.style.gridRowEnd = "span " + span;
    });
  });
}
function setupMasonry() {
  const imgs = document.querySelectorAll(".gallery .ph img");
  if (!imgs.length) return;
  imgs.forEach((img) => {
    if (!img.complete) img.addEventListener("load", layoutMasonry, { once: true });
  });
  window.addEventListener("load", layoutMasonry);
  let t;
  window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(layoutMasonry, 120); });
  layoutMasonry();
}

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const cinematic = initCinematic();
  const parallax = setupParallax();
  setupTilt();
  setupMasonry();

  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    window.__lenis = lenis;
  }
  function raf(t) {
    if (lenis) lenis.raf(t);
    if (cinematic) cinematic.update();
    parallax.update();
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // reveal + counters
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      if (e.target.classList.contains("stat-num")) animateCount(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.18 });
  document.querySelectorAll(".reveal,.reveal-l,.reveal-r,.reveal-up,.reveal-scale,.stat-num").forEach((el) => io.observe(el));

  // anchor links via lenis
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (el && lenis) { e.preventDefault(); lenis.scrollTo(el, { offset: -70 }); }
    });
  });

  // year
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // contact form (demo)
  document.querySelectorAll("form[data-demo]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const note = form.querySelector(".form-note");
      if (note) { note.hidden = false; }
      form.reset();
    });
  });
});
