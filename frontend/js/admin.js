/**
 * admin.js — Lumina Studio Admin Panel
 * Covers HU-15 (Citas), HU-16 (Ingresos), HU-17 (Profesionales ocupados),
 *         HU-18 (Eliminar profesionales), HU-19 (Añadir profesionales),
 *         HU-20 (Notificaciones WhatsApp)
 */

import { getApiBase } from "./config.js";

// ── Session & API config ──────────────────────────────────────────────────────
const session  = JSON.parse(sessionStorage.getItem("adminSession") || "null");
const API_BASE = getApiBase();

if (!session) {
  window.location.href = "admin-login.html";
}

const TOKEN = session?.token || "";

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${TOKEN}`,
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  apptFilter:    "day",
  revenueFilter: "day",
  profToDelete:  null,
};

// ── DOM helpers ───────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showToast(msg, duration = 2800) {
  const t = $("admin-toast");
  t.textContent = msg;
  t.classList.add("visible");
  setTimeout(() => t.classList.remove("visible"), duration);
}

function openModal(id)  { $(id)?.classList.add("open"); }
function closeModal(id) { $(id)?.classList.remove("open"); }

function fmtCurrency(n) {
  return `$${Number(n).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(isoStr) {
  return new Date(isoStr).toLocaleDateString("es-CO", {
    day:    "numeric",
    month:  "short",
    year:   "numeric",
  });
}

function fmtTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString("es-CO", {
    hour:   "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status) {
  const map = {
    pending:   ["pending",   "Reservada"],
    confirmed: ["confirmed", "Confirmada"],
    completed: ["completed", "Completada"],
    cancelled: ["cancelled", "Cancelada"],
  };
  const [cls, label] = map[status] || ["pending", status];
  return `<span class="admin-badge admin-badge--${cls}">${label}</span>`;
}

// ── Navigation ────────────────────────────────────────────────────────────────
const sectionTitles = {
  overview:      "Resumen del negocio",
  appointments:  "Gestión de Citas",
  revenue:       "Ingresos del Negocio",
  professionals: "Equipo Profesional",
  notifications: "Notificaciones WhatsApp",
};

function activateSection(name) {
  document.querySelectorAll(".admin-nav__item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.section === name);
  });
  document.querySelectorAll(".admin-section").forEach((sec) => {
    sec.classList.toggle("active", sec.id === `section-${name}`);
  });
  $("section-title").textContent = sectionTitles[name] || name;
}

document.querySelectorAll(".admin-nav__item").forEach((btn) => {
  btn.addEventListener("click", () => activateSection(btn.dataset.section));
});

// ── Logout ────────────────────────────────────────────────────────────────────
$("admin-logout-btn")?.addEventListener("click", () => {
  sessionStorage.removeItem("adminSession");
  window.location.href = "admin-login.html";
});

// ══════════════════════════════════════════════════════════════════════════════
//  OVERVIEW — KPI cards + busy professionals
// ══════════════════════════════════════════════════════════════════════════════
async function loadOverview() {
  try {
    const [appts, revenue, busy] = await Promise.all([
      api("/api/admin/appointments?filter=day"),
      api("/api/admin/revenue?filter=day"),
      api(`/api/admin/professionals/busy?date=${todayISO()}`),
    ]);

    $("overview-kpis").innerHTML = `
      <div class="admin-kpi">
        <p class="admin-kpi__label">Citas hoy</p>
        <p class="admin-kpi__value">${appts.total}</p>
        <p class="admin-kpi__sub">${appts.counts.reserved} reservadas · ${appts.counts.confirmed} confirmadas</p>
      </div>
      <div class="admin-kpi">
        <p class="admin-kpi__label">Ingresos hoy</p>
        <p class="admin-kpi__value">${fmtCurrency(revenue.total)}</p>
        <p class="admin-kpi__sub">${revenue.appointments} citas completadas</p>
      </div>
      <div class="admin-kpi">
        <p class="admin-kpi__label">Canceladas hoy</p>
        <p class="admin-kpi__value">${appts.counts.cancelled}</p>
        <p class="admin-kpi__sub">de ${appts.total} citas totales</p>
      </div>
      <div class="admin-kpi">
        <p class="admin-kpi__label">Profesionales activos</p>
        <p class="admin-kpi__value">${busy.professionals.length}</p>
        <p class="admin-kpi__sub">con citas pendientes</p>
      </div>`;

    $("busy-date-label").textContent = new Date().toLocaleDateString("es-CO", {
      weekday: "long", day: "numeric", month: "long",
    });

    renderBusyList(busy.professionals, "busy-professionals-list");
  } catch (err) {
    $("overview-kpis").innerHTML = `<p style="color:#9b2638;grid-column:1/-1">Error cargando datos. ¿El backend está activo?</p>`;
    console.error(err);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  HU-15 — APPOINTMENTS
// ══════════════════════════════════════════════════════════════════════════════
async function loadAppointments(filter = "day") {
  state.apptFilter = filter;
  const tbody = $("appointments-tbody");
  tbody.innerHTML = `<tr><td colspan="6" class="admin-table__loading">Cargando…</td></tr>`;

  try {
    const data = await api(`/api/admin/appointments?filter=${filter}`);

    // Update chips
    $("appt-count-reserved").textContent  = data.counts.reserved;
    $("appt-count-confirmed").textContent = data.counts.confirmed;
    $("appt-count-completed").textContent = data.counts.completed;
    $("appt-count-cancelled").textContent = data.counts.cancelled;
    $("appt-total-label").textContent     = `${data.total} cita${data.total !== 1 ? "s" : ""} en total`;

    // Flatten all appointments
    const all = [
      ...data.reserved,
      ...data.confirmed,
      ...data.completed,
      ...data.cancelled,
    ].sort((a, b) =>
      new Date(a.appointment_datetime) - new Date(b.appointment_datetime),
    );

    if (!all.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="admin-table__loading">No hay citas para este período.</td></tr>`;
      return;
    }

    tbody.innerHTML = all.map((appt) => `
      <tr>
        <td style="color:#9b7177;font-size:0.8rem">#${String(appt.id).padStart(4,"0")}</td>
        <td><strong>${appt.client_name}</strong><br><span style="font-size:0.75rem;color:#9b7177">${appt.client_phone}</span></td>
        <td>${appt.service?.name ?? "—"}</td>
        <td>${appt.professional?.name ?? "—"}</td>
        <td>${fmtDate(appt.appointment_datetime)}<br><span style="font-size:0.75rem;color:#9b7177">${fmtTime(appt.appointment_datetime)}</span></td>
        <td>${statusBadge(appt.status)}</td>
      </tr>`).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-table__loading" style="color:#9b2638">Error: ${err.message}</td></tr>`;
  }
}

// Filter buttons — Appointments
document.querySelectorAll("#section-appointments .admin-filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#section-appointments .admin-filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    loadAppointments(btn.dataset.filter);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  HU-16 — REVENUE
// ══════════════════════════════════════════════════════════════════════════════
async function loadRevenue(filter = "day") {
  state.revenueFilter = filter;
  $("revenue-total").textContent = "Cargando…";

  try {
    const data = await api(`/api/admin/revenue?filter=${filter}`);

    $("revenue-total").textContent = fmtCurrency(data.total);
    $("revenue-appointments-count").textContent =
      `${data.appointments} cita${data.appointments !== 1 ? "s" : ""} completada${data.appointments !== 1 ? "s" : ""}`;

    // Category bars
    const catEl    = $("revenue-by-category");
    const entries  = Object.entries(data.by_category).sort((a, b) => b[1] - a[1]);
    const maxVal   = entries.length ? entries[0][1] : 1;

    catEl.innerHTML = entries.length
      ? entries.map(([cat, amount]) => `
        <div class="admin-category-bar">
          <span class="admin-category-bar__label" title="${cat}">${cat}</span>
          <div class="admin-category-bar__track">
            <div class="admin-category-bar__fill" style="width: ${(amount / maxVal * 100).toFixed(1)}%"></div>
          </div>
          <span class="admin-category-bar__amount">${fmtCurrency(amount)}</span>
        </div>`).join("")
      : `<p style="color:#9b7177;text-align:center;padding:20px">Sin datos de ingresos para este período.</p>`;

    // Daily chart (only for week/month)
    const dailyCard  = $("revenue-daily-card");
    const dailyChart = $("revenue-daily-chart");
    const dailyEntries = Object.entries(data.daily).sort((a, b) => a[0].localeCompare(b[0]));

    if (filter === "day" || !dailyEntries.length) {
      dailyCard.style.display = "none";
    } else {
      dailyCard.style.display = "";
      const chartMax = Math.max(...dailyEntries.map((e) => e[1]), 1);
      const MAX_HEIGHT = 100; // px
      dailyChart.innerHTML = dailyEntries.map(([dateStr, amount]) => {
        const barH = Math.round((amount / chartMax) * MAX_HEIGHT);
        const shortDate = new Date(dateStr + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" });
        return `
          <div class="admin-bar-chart__col">
            <span class="admin-bar-chart__value">${fmtCurrency(amount).replace("$","$")}</span>
            <div class="admin-bar-chart__bar" style="height:${barH}px"></div>
            <span class="admin-bar-chart__date">${shortDate}</span>
          </div>`;
      }).join("");
    }
  } catch (err) {
    $("revenue-total").textContent = "Error";
    console.error(err);
  }
}

// Filter buttons — Revenue
document.querySelectorAll("#section-revenue .admin-filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#section-revenue .admin-filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    loadRevenue(btn.dataset.filter);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  HU-17 — BUSY PROFESSIONALS
// ══════════════════════════════════════════════════════════════════════════════
function renderBusyList(professionals, containerId) {
  const el = $(containerId);
  if (!el) return;

  if (!professionals.length) {
    el.innerHTML = `<p class="admin-busy-empty">No hay profesionales con citas para este día.</p>`;
    return;
  }

  el.innerHTML = professionals.map((item) => {
    const p        = item.professional;
    const avatarEl = p.photo_url
      ? `<img class="admin-busy-item__avatar" src="${p.photo_url}" alt="${p.name}" onerror="this.style.display='none'">`
      : `<div class="admin-busy-item__avatar admin-prof-card__avatar--fallback">◎</div>`;

    return `
      <div class="admin-busy-item">
        <div class="admin-busy-item__left">
          ${avatarEl}
          <div>
            <div class="admin-busy-item__name">${p.name}</div>
            <div class="admin-busy-item__title">${p.title || "Profesional"}</div>
          </div>
        </div>
        <div class="admin-busy-item__count">
          <span class="admin-busy-item__num">${item.appointments}</span>
          <span class="admin-busy-item__num-label">cita${item.appointments !== 1 ? "s" : ""}</span>
        </div>
      </div>`;
  }).join("");
}

async function loadBusyProfessionals(dateStr) {
  const el = $("busy-professionals-section");
  el.innerHTML = `<div class="skeleton" style="height:68px;border-radius:8px"></div>`;

  try {
    const data = await api(`/api/admin/professionals/busy?date=${dateStr}`);
    renderBusyList(data.professionals, "busy-professionals-section");
  } catch (err) {
    el.innerHTML = `<p class="admin-busy-empty" style="color:#9b2638">Error: ${err.message}</p>`;
  }
}

$("busy-date-input")?.addEventListener("change", (e) => {
  if (e.target.value) loadBusyProfessionals(e.target.value);
});

// ══════════════════════════════════════════════════════════════════════════════
//  HU-18 — LIST & DELETE PROFESSIONALS
// ══════════════════════════════════════════════════════════════════════════════
async function loadProfessionals() {
  const grid = $("professionals-grid");
  grid.innerHTML = `
    <div class="skeleton" style="height:110px;border-radius:8px"></div>
    <div class="skeleton" style="height:110px;border-radius:8px"></div>
    <div class="skeleton" style="height:110px;border-radius:8px"></div>`;

  try {
    const profs = await api("/api/admin/professionals");
    renderProfessionalsGrid(profs);
  } catch (err) {
    grid.innerHTML = `<p style="color:#9b2638">Error cargando profesionales: ${err.message}</p>`;
  }
}

function renderProfessionalsGrid(profs) {
  const grid = $("professionals-grid");

  if (!profs.length) {
    grid.innerHTML = `<p style="color:#9b7177;grid-column:1/-1">No hay profesionales registrados.</p>`;
    return;
  }

  grid.innerHTML = profs.map((p) => {
    const avatarEl = p.photo_url
      ? `<img class="admin-prof-card__avatar" src="${p.photo_url}" alt="${p.name}" onerror="this.replaceWith(document.createElement('div'))">`
      : `<div class="admin-prof-card__avatar admin-prof-card__avatar--fallback">◎</div>`;

    const statusCls = p.is_active ? "active" : "inactive";
    const statusTxt = p.is_active ? "Activo" : "Inactivo";

    return `
      <div class="admin-prof-card" data-id="${p.id}">
        <div class="admin-prof-card__top">
          ${avatarEl}
          <div>
            <div class="admin-prof-card__name">${p.name}</div>
            <div class="admin-prof-card__title">${p.title || "Profesional"}</div>
          </div>
        </div>
        <div class="admin-prof-card__creds">
          <span><strong>Usuario:</strong> ${p.username || "—"}</span>
          <span><strong>Contraseña:</strong> ••••••••</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <span class="admin-prof-card__status admin-prof-card__status--${statusCls}">${statusTxt}</span>
          <button class="admin-prof-card__delete-btn" data-id="${p.id}" data-name="${p.name}">
            Eliminar empleada
          </button>
        </div>
      </div>`;
  }).join("");

  // Bind delete buttons
  grid.querySelectorAll(".admin-prof-card__delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.profToDelete = { id: Number(btn.dataset.id), name: btn.dataset.name };
      $("delete-prof-desc").textContent =
        `¿Seguro que deseas eliminar a ${btn.dataset.name} del sistema? ` +
        `Esta acción desactivará su acceso. Sus citas anteriores se conservarán.`;
      openModal("delete-prof-modal");
    });
  });
}

$("delete-prof-cancel")?.addEventListener("click", () => closeModal("delete-prof-modal"));

$("delete-prof-confirm")?.addEventListener("click", async () => {
  if (!state.profToDelete) return;
  const btn = $("delete-prof-confirm");
  btn.textContent = "Eliminando…";
  btn.disabled = true;

  try {
    await api(`/api/admin/professionals/${state.profToDelete.id}`, { method: "DELETE" });
    showToast(`${state.profToDelete.name} eliminado correctamente.`);
    closeModal("delete-prof-modal");
    loadProfessionals();
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    btn.textContent = "Confirmar";
    btn.disabled = false;
    state.profToDelete = null;
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  HU-19 — ADD PROFESSIONAL
// ══════════════════════════════════════════════════════════════════════════════
$("add-professional-btn")?.addEventListener("click", () => {
  // Reset form
  ["new-prof-name", "new-prof-title", "new-prof-username", "new-prof-password"].forEach(
    (id) => { $(id).value = ""; }
  );
  $("add-prof-error").style.display = "none";
  openModal("add-prof-modal");
});

$("add-prof-close")?.addEventListener("click", () => closeModal("add-prof-modal"));

$("confirm-add-prof-btn")?.addEventListener("click", async () => {
  const name     = $("new-prof-name").value.trim();
  const title    = $("new-prof-title").value.trim();
  const username = $("new-prof-username").value.trim();
  const password = $("new-prof-password").value;

  const errEl = $("add-prof-error");
  errEl.style.display = "none";

  if (!username || !password) {
    errEl.textContent = "Usuario y contraseña son obligatorios.";
    errEl.style.display = "block";
    return;
  }
  if (password.length < 6) {
    errEl.textContent = "La contraseña debe tener al menos 6 caracteres.";
    errEl.style.display = "block";
    return;
  }

  const btn = $("confirm-add-prof-btn");
  btn.textContent = "Registrando…";
  btn.disabled = true;

  try {
    await api("/api/admin/professionals", {
      method: "POST",
      body:   JSON.stringify({ name, title, username, password }),
    });
    showToast(`Profesional '${username}' creado correctamente.`);
    closeModal("add-prof-modal");
    loadProfessionals();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = "block";
  } finally {
    btn.textContent = "Confirmar registro de usuario";
    btn.disabled = false;
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  HU-20 — NOTIFICATIONS (WhatsApp)
// ══════════════════════════════════════════════════════════════════════════════
$("send-notif-btn")?.addEventListener("click", async () => {
  const dateVal = $("notif-date").value || todayISO();
  const btn     = $("send-notif-btn");
  btn.textContent = "Enviando…";
  btn.disabled = true;

  const logEl      = $("notif-log");
  const logItems   = $("notif-log-items");
  const logTitle   = $("notif-log-title");

  try {
    const data = await api("/api/admin/notifications/send", {
      method: "POST",
      body:   JSON.stringify({ date: dateVal }),
    });

    logEl.style.display = "";
    logTitle.textContent = `Resultado: ${data.sent.length} mensaje${data.sent.length !== 1 ? "s" : ""} procesado${data.sent.length !== 1 ? "s" : ""}`;

    if (!data.sent.length) {
      logItems.innerHTML = `<div class="admin-notif-log-item"><div class="admin-notif-log-item__to">Sin citas para ${dateVal}</div></div>`;
    } else {
      logItems.innerHTML = data.sent.map((item) => `
        <div class="admin-notif-log-item ${item.simulated ? "admin-notif-log-item--simulated" : ""}">
          <div class="admin-notif-log-item__to">→ ${item.to}${item.phone ? ` (${item.phone})` : ""}</div>
          <div class="admin-notif-log-item__msg">${(item.message || "").slice(0, 200)}…</div>
          ${item.note ? `<div class="admin-notif-log-item__note">ℹ ${item.note}</div>` : ""}
        </div>`).join("");
    }

    if (data.errors.length) {
      logItems.innerHTML += data.errors.map((e) => `
        <div class="admin-notif-log-item" style="background:rgba(168,83,83,0.06)">
          <div class="admin-notif-log-item__to" style="color:#9b2638">✗ Error: ${e.to}</div>
          <div class="admin-notif-log-item__msg">${e.error}</div>
        </div>`).join("");
    }

    showToast(data.simulated
      ? `Modo simulado: ${data.sent.length} mensajes registrados.`
      : `${data.sent.length} mensajes enviados correctamente.`
    );
  } catch (err) {
    showToast(`Error: ${err.message}`);
    console.error(err);
  } finally {
    btn.textContent = "Enviar recordatorios";
    btn.disabled = false;
  }
});

$("clear-log-btn")?.addEventListener("click", () => {
  $("notif-log").style.display = "none";
  $("notif-log-items").innerHTML = "";
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Topbar
  $("today-date").textContent = new Date().toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  $("admin-username-display").textContent = session?.username || "Admin";

  // Set default date inputs to today
  const todayStr = todayISO();
  const busyInput = $("busy-date-input");
  if (busyInput) busyInput.value = todayStr;
  const notifInput = $("notif-date");
  if (notifInput) notifInput.value = todayStr;

  // Load overview (default section)
  loadOverview();

  // Lazy-load sections on first visit
  document.querySelectorAll(".admin-nav__item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.dataset.section;
      switch (section) {
        case "appointments":  loadAppointments(state.apptFilter);   break;
        case "revenue":       loadRevenue(state.revenueFilter);      break;
        case "professionals": loadProfessionals(); loadBusyProfessionals(todayStr); break;
        case "notifications": /* nothing to preload */              break;
      }
    });
  });

  // Close modals on overlay click
  ["add-prof-modal", "delete-prof-modal"].forEach((id) => {
    $(id)?.addEventListener("click", (e) => {
      if (e.target === $(id)) closeModal(id);
    });
  });
});
