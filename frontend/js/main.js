/**
 * main.js — Landing page interactions for Lumina Studio
 */

import { fetchServices, fetchProfessionals } from "./api.js";

// ── Scroll animations ─────────────────────────────────────────────────────────
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("visible");
      }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
  );
  document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));
}

// ── Sticky nav ────────────────────────────────────────────────────────────────
function initNav() {
  const nav = document.querySelector(".nav");
  const hamburger = document.querySelector(".nav__hamburger");
  const links = document.querySelector(".nav__links");

  window.addEventListener(
    "scroll",
    () => {
      nav.classList.toggle("scrolled", window.scrollY > 20);
    },
    { passive: true },
  );

  hamburger?.addEventListener("click", () => {
    links.classList.toggle("open");
  });

  // Active link highlighting
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav__links a");

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          navLinks.forEach((l) => l.classList.remove("active"));
          const link = document.querySelector(
            `.nav__links a[href="#${e.target.id}"]`,
          );
          link?.classList.add("active");
        }
      });
    },
    { threshold: 0.4 },
  );
  sections.forEach((s) => sectionObserver.observe(s));
}

// ── Hero parallax ─────────────────────────────────────────────────────────────
function initHeroParallax() {
  const heroBg = document.querySelector(".hero__bg");
  if (!heroBg) return;
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY * 0.25;
      heroBg.style.transform = `scale(1) translateY(${y}px)`;
    },
    { passive: true },
  );
  // Trigger loaded class for Ken Burns
  requestAnimationFrame(() =>
    document.querySelector(".hero")?.classList.add("loaded"),
  );
}

// ── Render services (landing carousel) ────────────────────────────────────────
async function renderServices() {
  const grid = document.getElementById("services-grid");
  const prevBtn = document.getElementById("services-prev");
  const nextBtn = document.getElementById("services-next");
  if (!grid) return;

  try {
    const services = await fetchServices();
    grid.innerHTML = "";

    services.forEach((svc, i) => {
      const card = document.createElement("article");
      card.className = `service-card fade-in fade-in--delay-${(i % 3) + 1}`;
      card.innerHTML = `
        <div class="service-card__img-wrap">
          <img src="${svc.image_url}" alt="${svc.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600&q=80'">
          <span class="service-card__badge">${svc.duration_minutes} min</span>
        </div>
        <div class="service-card__body">
          <div class="service-card__header">
            <h3 class="service-card__name">${svc.name}</h3>
            <span class="service-card__price">$${svc.price}</span>
          </div>
          <p class="service-card__desc">${svc.description}</p>
          <a href="booking.html?service=${svc.id}" class="btn btn--dark" style="width:100%;justify-content:center;">Seleccionar</a>
        </div>`;
      grid.appendChild(card);
    });

    // Carousel controls
    const scrollAmount = 340; // card width + gap approx
    prevBtn?.addEventListener("click", () => {
      grid.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    });
    nextBtn?.addEventListener("click", () => {
      grid.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });

    // Re-observe new elements
    initScrollAnimations();
  } catch (err) {
    console.warn("Could not load services:", err.message);
    grid.innerHTML = `<p style="color:var(--clr-text-muted);grid-column:1/-1;text-align:center">No se pudieron cargar los servicios. Asegúrate de que el backend está corriendo.</p>`;
  }
}

// ── Render professionals (landing) ────────────────────────────────────────────
async function renderProfessionals() {
  const grid = document.getElementById("professionals-grid");
  if (!grid) return;

  try {
    const profs = await fetchProfessionals();
    grid.innerHTML = "";

    profs.forEach((p, i) => {
      const stars =
        "★".repeat(Math.round(p.rating)) + "☆".repeat(5 - Math.round(p.rating));
      const card = document.createElement("article");
      card.className = `professional-card fade-in fade-in--delay-${(i % 3) + 1}`;
      card.innerHTML = `
        <img class="professional-card__img" src="${p.photo_url}" alt="${p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80'">
        <div class="professional-card__body">
          <h3 class="professional-card__name">${p.name}</h3>
          <p class="professional-card__title">${p.title}</p>
          <p class="professional-card__bio">${p.bio}</p>
          <div class="rating">
            <span class="rating__stars">${stars}</span>
            <span>${p.rating} (${p.reviews} reseñas)</span>
          </div>
        </div>`;
      grid.appendChild(card);
    });

    initScrollAnimations();
  } catch (err) {
    console.warn("Could not load professionals:", err.message);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initHeroParallax();
  initScrollAnimations();
  renderServices();
  renderProfessionals();
});
