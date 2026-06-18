import {
  loginProfessional,
  fetchProfessionalAppointments,
  confirmAppointment,
  completeAppointment,
  deleteAppointment,
  createProfessionalBlock,
} from "./api.js";

const state = {
  professional: JSON.parse(
    sessionStorage.getItem("professionalSession") || "null",
  ),
  appointments: [],
  selectedAppointment: null,
  selectedBlockDate: new Date(),
  selectedBlockSlot: { start: "10:00", end: "11:00" },
};

const dashboard = document.getElementById("dashboard");
const listEl = document.getElementById("appointments-list");
const appointmentModal = document.getElementById("appointment-modal");
const cancelModal = document.getElementById("cancel-modal");
const completeModal = document.getElementById("complete-modal");
const confirmModal = document.getElementById("confirm-modal");

function setView() {
  const loggedIn = Boolean(state.professional);
  if (!loggedIn) {
    window.location.href = "login.html";
    return;
  }
  document.body.classList.add("is-logged-in");
  dashboard.hidden = false;
  loadDashboard();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 2400);
}

function formatTime(date) {
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLongDate(date) {
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

document.getElementById("logout-btn")?.addEventListener("click", () => {
  sessionStorage.removeItem("professionalSession");
  state.professional = null;
  setView();
});

async function loadDashboard() {
  renderMiniWeek();
  renderQuickSlots();
  await loadAppointments();
}

async function loadAppointments() {
  listEl.innerHTML = `<div class="pro-skeleton"></div><div class="pro-skeleton"></div>`;
  try {
    state.appointments = await fetchProfessionalAppointments(
      state.professional.id,
    );
    renderAppointments();
  } catch (err) {
    listEl.innerHTML = `<p class="empty-state">No se pudieron cargar las citas.</p>`;
  }
}

function renderAppointments() {
  const today = new Date();
  document.getElementById("today-label").textContent = today.toLocaleDateString(
    "es-CO",
    {
      weekday: "long",
      day: "numeric",
      month: "short",
    },
  );

  const appointments = state.appointments.slice(0, 5);
  if (!appointments.length) {
    listEl.innerHTML = `<p class="empty-state">No hay proximas citas.</p>`;
    document.getElementById("reminder-text").textContent =
      "No tienes citas pendientes por revisar.";
    return;
  }

  document.getElementById("reminder-text").textContent =
    `Tienes ${appointments.length} citas pendientes. Revisa disenos y tiempos de preparacion antes de iniciar.`;

  listEl.innerHTML = appointments
    .map((appt) => {
      const date = new Date(appt.appointment_datetime);
      const image =
        appt.design_image_url ||
        appt.service.image_url ||
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=240&q=80";
      return `
      <button class="pro-appointment-card" data-id="${appt.id}">
        <img src="${image}" alt="${appt.service.name}" loading="lazy">
        <span class="card-client">
          <strong>${appt.client_name}</strong>
          <small>${appt.service.name}</small>
        </span>
        <span class="card-time">
          <strong>${formatTime(date)}</strong>
          <small>Duracion: ${appt.service.duration_minutes} min</small>
        </span>
        <span class="card-arrow">›</span>
      </button>`;
    })
    .join("");

  listEl.querySelectorAll(".pro-appointment-card").forEach((card) => {
    card.addEventListener("click", () =>
      openAppointment(Number(card.dataset.id)),
    );
  });
}

function openAppointment(id) {
  state.selectedAppointment = state.appointments.find((appt) => appt.id === id);
  if (!state.selectedAppointment) return;

  const appt = state.selectedAppointment;
  const date = new Date(appt.appointment_datetime);
  const image =
    appt.design_image_url ||
    appt.service.image_url ||
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=720&q=85";

  // Hide design image for specific categories
  const hideDesign = ["Masajes & Spa", "Tratamientos Faciales"].includes(
    appt.service.category,
  );
  const phone = appt.client_phone.replace(/\D/g, "");

  document.getElementById("appointment-detail").innerHTML = `
    <div class="detail-layout">
      <section>
        <small class="appointment-code">CITA #${String(appt.id).padStart(4, "0")}</small>
        <h2>${appt.client_name}</h2>
        <ul class="detail-list">
          <li><span>✧</span>${appt.service.name}</li>
          <li><span>□</span>${formatLongDate(date)}</li>
          <li><span>◷</span>${formatTime(date)}</li>
        </ul>
        <div class="client-note">
          <strong>Notas del cliente</strong>
          <p>“${appt.notes || "Sin notas adicionales."}”</p>
        </div>
      </section>
      <section>
        ${
          !hideDesign
            ? `
          <strong class="design-label">Diseño a realizar</strong>
          <a href="${image}" target="_blank" class="design-large">
            <img src="${image}" alt="Diseño propuesto por ${appt.client_name}">
          </a>
        `
            : ""
        }
        <div class="detail-actions" style="margin-top: ${hideDesign ? "48px" : "24px"};">
          <a class="pro-primary-btn" href="https://wa.me/${phone}" target="_blank" rel="noopener">▣ Contactar cliente (WhatsApp)</a>
          <button class="outline-action" id="complete-appointment-btn-modal">Cita completada</button>
          <button class="text-danger" id="cancel-appointment-btn-modal">Cancelar cita</button>
          <button class="outline-action" id="confirm-appointment-btn-modal">Confirmar cita</button>
        </div>
      </section>
    </div>`;

  // Re-bind listeners for dynamic buttons
  document
    .getElementById("cancel-appointment-btn-modal")
    ?.addEventListener("click", () => cancelModal.classList.add("open"));
  document
    .getElementById("complete-appointment-btn-modal")
    ?.addEventListener("click", () => completeModal.classList.add("open"));
  document
    .getElementById("confirm-appointment-btn-modal")
    ?.addEventListener("click", () => confirmModal.classList.add("open"));

  appointmentModal.classList.add("open");
}

function closeModal(modal) {
  modal.classList.remove("open");
}

document
  .getElementById("modal-close")
  ?.addEventListener("click", () => closeModal(appointmentModal));
document
  .getElementById("cancel-back-btn")
  ?.addEventListener("click", () => closeModal(cancelModal));
document
  .getElementById("complete-back-btn")
  ?.addEventListener("click", () => closeModal(completeModal));
document
  .getElementById("confirm-back-btn")
  ?.addEventListener("click", () => closeModal(confirmModal));

document
  .getElementById("cancel-confirm-btn")
  ?.addEventListener("click", async () => {
    if (!state.selectedAppointment) return;
    await deleteAppointment(state.selectedAppointment.id);
    closeModal(cancelModal);
    closeModal(appointmentModal);
    showToast("Cita cancelada");
    loadAppointments();
  });

document
  .getElementById("complete-confirm-btn")
  ?.addEventListener("click", async () => {
    if (!state.selectedAppointment) return;
    await completeAppointment(state.selectedAppointment.id);
    closeModal(completeModal);
    closeModal(appointmentModal);
    showToast("Cita completada");
    loadAppointments();
  });

document
  .getElementById("confirm-confirm-btn")
  ?.addEventListener("click", async () => {
    if (!state.selectedAppointment) return;
    await confirmAppointment(state.selectedAppointment.id);
    closeModal(confirmModal);
    closeModal(appointmentModal);
    showToast("Cita confirmada");
    loadAppointments();
  });

function renderMiniWeek() {
  const week = document.getElementById("mini-week");
  const start = new Date();
  start.setDate(start.getDate() - 2);
  const labels = ["L", "M", "X", "J", "V", "S", "D"];
  week.innerHTML = labels
    .map((label, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const active =
        date.toDateString() === state.selectedBlockDate.toDateString();
      return `
      <button class="${active ? "active" : ""}" data-date="${date.toISOString()}">
        <span>${label}</span>
        <strong>${date.getDate()}</strong>
      </button>`;
    })
    .join("");

  week.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedBlockDate = new Date(btn.dataset.date);
      renderMiniWeek();
    });
  });
}

function renderQuickSlots() {
  document.querySelectorAll("#quick-slots button").forEach((btn) => {
    const isActive = btn.dataset.start === state.selectedBlockSlot.start;
    btn.classList.toggle("active", isActive);
    btn.addEventListener("click", () => {
      state.selectedBlockSlot = {
        start: btn.dataset.start,
        end: btn.dataset.end,
      };
      renderQuickSlots();
    });
  });
}

document
  .getElementById("confirm-block-btn")
  ?.addEventListener("click", async () => {
    const date = state.selectedBlockDate.toISOString().slice(0, 10);
    await createProfessionalBlock(state.professional.id, {
      start_datetime: `${date}T${state.selectedBlockSlot.start}:00`,
      end_datetime: `${date}T${state.selectedBlockSlot.end}:00`,
      reason: "Bloqueo manual del profesional",
    });
    showToast("Horario bloqueado");
  });

setView();
