/**
 * booking.js — 3-step booking wizard for Lumina Studio
 * Steps: 1=Service, 2=Professional+Schedule, 3=Details+Confirm
 */

import {
  fetchServices,
  fetchCategories,
  fetchProfessionalsByService,
  fetchAvailability,
  createAppointment,
  uploadDesignImage,
} from "./api.js";

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  currentStep: 1,
  selectedService: null,
  selectedProfessional: null, // null means "Any professional"
  selectedProfessionalId: null,
  selectedDate: null, // Date object
  selectedTime: null, // "HH:MM" string
  uploadedImageUrl: null,
  allServices: [],
  allProfessionals: [],
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const steps = document.querySelectorAll(".booking-step");
const progSteps = document.querySelectorAll(".progress-step");

// ── Step navigation ───────────────────────────────────────────────────────────
function goToStep(n) {
  if (n < 1 || n > 3) return;
  state.currentStep = n;
  steps.forEach((s, i) => s.classList.toggle("active", i + 1 === n));
  progSteps.forEach((ps, i) => {
    ps.classList.toggle("active", i + 1 === n);
    ps.classList.toggle("done", i + 1 < n);
  });

  // Hide design upload for specific categories in Step 3
  if (n === 3 && state.selectedService) {
    const designGroup = document.getElementById("design-upload-group");
    if (designGroup) {
      const hideDesign = ["Masajes & Spa", "Tratamientos Faciales"].includes(
        state.selectedService.category,
      );
      designGroup.style.display = hideDesign ? "none" : "";
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── STEP 1: Services ───────────────────────────────────────────────────────────
async function initStep1() {
  const grid = document.getElementById("services-booking-grid");
  const sidebar = document.getElementById("categories-list");
  const showMoreBtn = document.getElementById("show-more-btn");
  let visibleCount = 6;
  let activeCategory = "all";

  try {
    const [services, categories] = await Promise.all([
      fetchServices(),
      fetchCategories(),
    ]);
    state.allServices = services;

    // Build category sidebar
    if (sidebar) {
      const allBtn = document.createElement("button");
      allBtn.className = "category-btn active";
      allBtn.textContent = "Todos los Servicios";
      allBtn.addEventListener("click", () => filterCategory("all", allBtn));
      sidebar.appendChild(allBtn);

      categories.forEach((cat) => {
        const btn = document.createElement("button");
        btn.className = "category-btn";
        btn.textContent = cat;
        btn.addEventListener("click", () => filterCategory(cat, btn));
        sidebar.appendChild(btn);
      });
    }

    renderServiceCards();

    showMoreBtn?.addEventListener("click", () => {
      visibleCount += 4;
      renderServiceCards();
    });

    function filterCategory(cat, clickedBtn) {
      activeCategory = cat;
      visibleCount = 6;
      sidebar
        ?.querySelectorAll(".category-btn")
        .forEach((b) => b.classList.remove("active"));
      clickedBtn.classList.add("active");
      renderServiceCards();
    }

    function renderServiceCards() {
      if (!grid) return;
      const filtered =
        activeCategory === "all"
          ? state.allServices
          : state.allServices.filter((s) => s.category === activeCategory);
      const visible = filtered.slice(0, visibleCount);

      grid.innerHTML = "";
      visible.forEach((svc) => {
        const card = document.createElement("article");
        card.className = "service-booking-card";
        if (state.selectedService?.id === svc.id)
          card.classList.add("selected");
        card.dataset.id = svc.id;
        card.innerHTML = `
          <div class="service-booking-card__img-wrap">
            <img src="${svc.image_url}" alt="${svc.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600&q=80'">
            <span class="service-booking-card__duration">${svc.duration_minutes} min</span>
          </div>
          <div class="service-booking-card__body">
            <div class="service-booking-card__header">
              <span class="service-booking-card__name">${svc.name}</span>
              <span class="service-booking-card__price">$${svc.price}</span>
            </div>
            <p class="service-booking-card__desc">${svc.description}</p>
            <button class="btn btn--dark" style="width:100%">Seleccionar</button>
          </div>`;
        card.addEventListener("click", () => selectService(svc));
        grid.appendChild(card);
      });

      if (showMoreBtn) {
        showMoreBtn.style.display =
          filtered.length > visibleCount ? "" : "none";
      }
    }
  } catch (err) {
    if (grid)
      grid.innerHTML = `<p style="color:var(--clr-text-muted);grid-column:1/-1;text-align:center">
      Error cargando servicios. No se pudo conectar con la API del servicio.</p>`;
    console.error(err);
  }
}

function selectService(svc) {
  state.selectedService = svc;
  // Highlight selected
  document.querySelectorAll(".service-booking-card").forEach((c) => {
    c.classList.toggle("selected", parseInt(c.dataset.id) === svc.id);
  });
  // Auto advance after brief delay
  setTimeout(() => goToStep(2), 300);
  initStep2();
}

// ── STEP 2: Professional + Schedule ───────────────────────────────────────────
async function initStep2() {
  const profList = document.getElementById("prof-list");
  if (!profList) return;

  profList.innerHTML =
    `<div class="skeleton" style="height:80px;border-radius:12px;margin-bottom:12px"></div>`.repeat(
      3,
    );

  try {
    const profs = await fetchProfessionalsByService(state.selectedService.id);
    state.allProfessionals = profs;
    profList.innerHTML = "";

    // "Any professional" option
    const anyCard = createProfCard({
      id: 0,
      name: "Cualquier Profesional",
      title: "Selección automática según disponibilidad",
      photo_url: null,
      rating: null,
      reviews: null,
    });
    profList.appendChild(anyCard);

    profs.forEach((p) => profList.appendChild(createProfCard(p)));

    // Auto-select "any"
    selectProfessional({ id: 0, name: "Cualquier Profesional" });
  } catch (err) {
    profList.innerHTML = `<p style="color:var(--clr-text-muted)">Error cargando profesionales.</p>`;
    console.error(err);
  }

  initCalendar();
}

function createProfCard(p) {
  const card = document.createElement("div");
  card.className = "prof-card";
  card.dataset.id = p.id;

  const avatarHtml = p.photo_url
    ? `<img class="prof-card__avatar" src="${p.photo_url}" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80'">`
    : `<div class="prof-card__avatar prof-card__avatar--any">👥</div>`;

  const ratingHtml = p.rating
    ? `<div class="prof-card__rating"><span class="stars">★</span> ${p.rating} (${p.reviews} reseñas)</div>`
    : "";

  card.innerHTML = `
    ${avatarHtml}
    <div class="prof-card__info">
      <div class="prof-card__name">${p.name}</div>
      <div class="prof-card__title">${p.title || ""}</div>
      ${ratingHtml}
    </div>
    <div class="prof-card__check">✓</div>`;

  card.addEventListener("click", () => selectProfessional(p));
  return card;
}

function selectProfessional(p) {
  state.selectedProfessional = p;
  state.selectedProfessionalId = p.id;
  document.querySelectorAll(".prof-card").forEach((c) => {
    c.classList.toggle("selected", parseInt(c.dataset.id) === p.id);
  });
  // Refresh slots when professional changes
  if (state.selectedDate) loadSlots(state.selectedDate);
}

// ── Calendar ──────────────────────────────────────────────────────────────────
let calDate = new Date();

function initCalendar() {
  calDate = new Date();
  renderCalendar();

  document.getElementById("cal-prev")?.addEventListener("click", () => {
    calDate.setMonth(calDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById("cal-next")?.addEventListener("click", () => {
    calDate.setMonth(calDate.getMonth() + 1);
    renderCalendar();
  });
}

function renderCalendar() {
  const grid = document.getElementById("cal-grid");
  const monthLabel = document.getElementById("cal-month");
  const prevBtn = document.getElementById("cal-prev");
  if (!grid) return;

  const now = new Date();
  const year = calDate.getFullYear();
  const month = calDate.getMonth();

  // Disable prev button if we're in current month
  if (prevBtn)
    prevBtn.disabled = year === now.getFullYear() && month === now.getMonth();

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  if (monthLabel) monthLabel.textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // make Monday=0

  // Remove existing day cells (keep day-name headers)
  grid.querySelectorAll(".calendar__day").forEach((d) => d.remove());

  // Leading blanks
  for (let i = 0; i < startOffset; i++) {
    const blank = document.createElement("div");
    blank.className = "calendar__day other-month";
    grid.appendChild(blank);
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement("div");
    cell.className = "calendar__day";
    cell.textContent = d;

    const thisDate = new Date(year, month, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (thisDate < today) {
      cell.classList.add("disabled");
    } else {
      if (thisDate.toDateString() === today.toDateString())
        cell.classList.add("today");

      if (
        state.selectedDate &&
        thisDate.toDateString() === state.selectedDate.toDateString()
      ) {
        cell.classList.add("selected");
      }

      cell.addEventListener("click", () => {
        document
          .querySelectorAll(".calendar__day")
          .forEach((c) => c.classList.remove("selected"));
        cell.classList.add("selected");
        state.selectedDate = thisDate;
        state.selectedTime = null;
        loadSlots(thisDate);
      });
    }

    grid.appendChild(cell);
  }
}

// ── Time slots ────────────────────────────────────────────────────────────────
async function loadSlots(date) {
  const container = document.getElementById("slots-container");
  if (!container) return;

  container.innerHTML =
    `<div class="skeleton" style="height:40px;width:100%;border-radius:8px;margin-bottom:8px"></div>`.repeat(
      2,
    );

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  // For "any professional" pick first available
  const profId =
    state.selectedProfessionalId === 0
      ? (state.allProfessionals[0]?.id ?? 1)
      : state.selectedProfessionalId;

  try {
    const slots = await fetchAvailability(
      profId,
      dateStr,
      state.selectedService?.id,
    );
    renderSlots(slots);
  } catch (err) {
    container.innerHTML = `<p class="slots-empty">Error cargando horarios.</p>`;
    console.error(err);
  }
}

function renderSlots(slots) {
  const container = document.getElementById("slots-container");
  if (!container) return;

  if (!slots.length) {
    container.innerHTML = `<p class="slots-empty">No hay horarios disponibles para este día.</p>`;
    return;
  }

  const morning = slots.filter((s) => parseInt(s.split(":")[0]) < 14);
  const afternoon = slots.filter((s) => parseInt(s.split(":")[0]) >= 14);

  let html = "";
  if (morning.length) {
    html += `<div class="slots-section">
      <p class="slots-group-title">Mañana</p>
      <div class="slots-grid">${morning.map(slotBtn).join("")}</div>
    </div>`;
  }
  if (afternoon.length) {
    html += `<div class="slots-section">
      <p class="slots-group-title">Tarde</p>
      <div class="slots-grid">${afternoon.map(slotBtn).join("")}</div>
    </div>`;
  }

  container.innerHTML = html;
  container.querySelectorAll(".slot-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container
        .querySelectorAll(".slot-btn")
        .forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      state.selectedTime = btn.dataset.time;
    });
  });
}

function slotBtn(time) {
  const isSelected = state.selectedTime === time;
  return `<button class="slot-btn${isSelected ? " selected" : ""}" data-time="${time}">${time}</button>`;
}

// ── Step 2 → 3 ────────────────────────────────────────────────────────────────
document.getElementById("btn-next-step2")?.addEventListener("click", () => {
  if (!state.selectedDate || !state.selectedTime) {
    alert("Por favor selecciona una fecha y un horario.");
    return;
  }
  goToStep(3);
  renderSummaryCard();
});

// ── STEP 3: Details + Summary ─────────────────────────────────────────────────
function renderSummaryCard() {
  const svc = state.selectedService;
  const prof = state.selectedProfessional;
  const date = state.selectedDate;
  const time = state.selectedTime;

  if (!svc || !date || !time) return;

  const dateStr = date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const profName = prof?.id === 0 ? "Cualquier disponible" : (prof?.name ?? "");

  // Summary image
  const imgEl = document.getElementById("summary-img");
  if (imgEl) imgEl.src = svc.image_url || "";

  const titleEl = document.getElementById("summary-service-name");
  if (titleEl) titleEl.textContent = svc.name;

  const rows = {
    "summary-prof": profName,
    "summary-date": dateStr,
    "summary-time": time,
    "summary-total": `$${svc.price}`,
  };
  Object.entries(rows).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
}

// ── Home service toggle ───────────────────────────────────────────────────────
const homeToggle = document.getElementById("home-service-toggle");
const addressGroup = document.getElementById("address-group");

homeToggle?.addEventListener("change", () => {
  if (addressGroup)
    addressGroup.style.display = homeToggle.checked ? "" : "none";
});

// ── Image upload ──────────────────────────────────────────────────────────────
const uploadZone = document.getElementById("upload-zone");
const uploadInput = document.getElementById("upload-input");
const uploadPreview = document.getElementById("upload-preview");
const uploadPreviewImg = document.getElementById("upload-preview-img");
const uploadRemove = document.getElementById("upload-remove");

uploadZone?.addEventListener("click", () => uploadInput?.click());

uploadZone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("drag-over");
});

uploadZone?.addEventListener("dragleave", () =>
  uploadZone.classList.remove("drag-over"),
);

uploadZone?.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelect(file);
});

uploadInput?.addEventListener("change", () => {
  const file = uploadInput.files[0];
  if (file) handleFileSelect(file);
});

function handleFileSelect(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    if (uploadPreviewImg) uploadPreviewImg.src = e.target.result;
    if (uploadZone) uploadZone.style.display = "none";
    if (uploadPreview) uploadPreview.style.display = "";
  };
  reader.readAsDataURL(file);
  // Store file for upload on submit
  state._pendingFile = file;
}

uploadRemove?.addEventListener("click", () => {
  if (uploadZone) uploadZone.style.display = "";
  if (uploadPreview) uploadPreview.style.display = "none";
  if (uploadInput) uploadInput.value = "";
  state._pendingFile = null;
  state.uploadedImageUrl = null;
});

// ── Confirm appointment ───────────────────────────────────────────────────────
document.getElementById("btn-confirm")?.addEventListener("click", async () => {
  if (!validateForm()) return;

  const btn = document.getElementById("btn-confirm");
  btn.disabled = true;
  btn.textContent = "Procesando…";

  try {
    // Upload image if pending
    if (state._pendingFile) {
      const { url } = await uploadDesignImage(state._pendingFile);
      state.uploadedImageUrl = url;
    }

    const svc = state.selectedService;
    const prof = state.selectedProfessional;
    const date = state.selectedDate;
    const time = state.selectedTime;

    // Build ISO datetime: combine date + time string
    const [h, m] = time.split(":");
    const apptDate = new Date(date);
    apptDate.setHours(parseInt(h), parseInt(m), 0, 0);

    const profId =
      prof?.id === 0 ? (state.allProfessionals[0]?.id ?? 1) : prof?.id;

    const payload = {
      professional_id: profId,
      service_id: svc.id,
      client_name: document.getElementById("client-name").value.trim(),
      client_phone: document.getElementById("client-phone").value.trim(),
      client_address: homeToggle?.checked
        ? document.getElementById("client-address").value.trim()
        : null,
      notes: document.getElementById("client-notes").value.trim() || null,
      design_image_url: state.uploadedImageUrl || null,
      appointment_datetime: apptDate.toISOString(),
    };

    const appointment = await createAppointment(payload);
    showConfirmation(appointment);
  } catch (err) {
    alert(`Error al confirmar la cita: ${err.message}`);
    btn.disabled = false;
    btn.textContent = "Confirmar Cita";
  }
});

function validateForm() {
  let valid = true;
  const name = document.getElementById("client-name");
  const phone = document.getElementById("client-phone");

  [name, phone].forEach((input) => {
    const err = input?.nextElementSibling;
    if (!input?.value.trim()) {
      input?.classList.add("error");
      if (err?.classList.contains("form-error")) err.classList.add("visible");
      valid = false;
    } else {
      input?.classList.remove("error");
      if (err?.classList.contains("form-error"))
        err.classList.remove("visible");
    }
  });

  if (homeToggle?.checked) {
    const addr = document.getElementById("client-address");
    if (!addr?.value.trim()) {
      addr?.classList.add("error");
      valid = false;
    } else {
      addr?.classList.remove("error");
    }
  }

  return valid;
}

// ── Confirmation modal ────────────────────────────────────────────────────────
function showConfirmation(appt) {
  const modal = document.getElementById("confirm-modal");
  if (!modal) return;

  const svc = state.selectedService;
  const date = state.selectedDate;
  const time = state.selectedTime;
  const dateStr = date?.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const profName =
    state.selectedProfessional?.id === 0
      ? (state.allProfessionals[0]?.name ?? "Cualquier disponible")
      : (state.selectedProfessional?.name ?? "");

  const modalDetail = document.getElementById("modal-detail");
  if (modalDetail) {
    modalDetail.innerHTML = `
      <div class="modal__detail-row"><span>Servicio</span><span>${svc?.name}</span></div>
      <div class="modal__detail-row"><span>Profesional</span><span>${profName}</span></div>
      <div class="modal__detail-row"><span>Fecha</span><span>${dateStr}</span></div>
      <div class="modal__detail-row"><span>Hora</span><span>${time}</span></div>
      <div class="modal__detail-row"><span>Total</span><span>$${svc?.price}</span></div>`;
  }

  modal.classList.add("open");
}

document.getElementById("modal-close")?.addEventListener("click", () => {
  document.getElementById("confirm-modal")?.classList.remove("open");
  window.location.href = "index.html";
});

// ── URL param pre-selection ───────────────────────────────────────────────────
async function checkUrlPreselect() {
  const params = new URLSearchParams(window.location.search);
  const serviceId = params.get("service");
  if (!serviceId) return;
  try {
    const services = await fetchServices();
    state.allServices = services;
    const svc = services.find((s) => s.id === parseInt(serviceId));
    if (svc) {
      state.selectedService = svc;
      goToStep(2);
      initStep2();
    }
  } catch (_) {}
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Nav
  const nav = document.querySelector(".nav");
  window.addEventListener(
    "scroll",
    () => {
      nav?.classList.toggle("scrolled", window.scrollY > 20);
    },
    { passive: true },
  );

  // Hide address group initially
  if (addressGroup) addressGroup.style.display = "none";
  if (uploadPreview) uploadPreview.style.display = "none";

  await checkUrlPreselect();
  if (state.currentStep === 1) await initStep1();
});
