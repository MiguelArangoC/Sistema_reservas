/**
 * api.js — All backend API calls for Lumina Studio
 * Base URL can be overridden via localStorage key 'API_BASE'
 */

const API_BASE = localStorage.getItem("API_BASE") || "http://localhost:5000";

async function _request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Services ─────────────────────────────────────────────────────────────────
export async function fetchServices() {
  return _request("/api/services");
}

export async function fetchService(id) {
  return _request(`/api/services/${id}`);
}

export async function fetchCategories() {
  return _request("/api/services/categories");
}

// ── Professionals ─────────────────────────────────────────────────────────────
export async function fetchProfessionals() {
  return _request("/api/professionals");
}

export async function fetchProfessionalsByService(serviceId) {
  return _request(`/api/professionals/by-service/${serviceId}`);
}

// ── Availability ──────────────────────────────────────────────────────────────
export async function fetchAvailability(professionalId, dateStr, serviceId) {
  const qs = serviceId ? `?service_id=${serviceId}` : "";
  return _request(`/api/availability/${professionalId}/${dateStr}${qs}`);
}

// ── Appointments ──────────────────────────────────────────────────────────────
export async function createAppointment(payload) {
  return _request("/api/appointments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchAppointment(id) {
  return _request(`/api/appointments/${id}`);
}

// ── Upload ────────────────────────────────────────────────────────────────────
export async function uploadDesignImage(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Upload failed (HTTP ${res.status})`);
  return data; // { url: "/uploads/filename.jpg" }
}
