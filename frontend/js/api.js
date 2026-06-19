/**
 * api.js — All backend API calls for Lumina Studio
 * Base URL can be overridden via localStorage key 'API_BASE'
 */

import { getApiBase } from "./config.js";

const API_BASE = getApiBase();

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

export async function loginProfessional(username, password) {
  return _request("/api/professionals/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function fetchProfessionalBlocks(professionalId) {
  return _request(`/api/professionals/${professionalId}/unavailable`);
}

export async function createProfessionalBlock(professionalId, payload) {
  return _request(`/api/professionals/${professionalId}/unavailable`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteProfessionalBlock(professionalId, blockId) {
  return _request(`/api/professionals/${professionalId}/unavailable/${blockId}`, {
    method: "DELETE",
  });
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

export async function fetchProfessionalAppointments(professionalId) {
  return _request(`/api/appointments?professional_id=${professionalId}`);
}

export async function confirmAppointment(id) {
  return _request(`/api/appointments/${id}/confirm`, { method: "PATCH" });
}

export async function completeAppointment(id) {
  return _request(`/api/appointments/${id}/complete`, { method: "PATCH" });
}

export async function deleteAppointment(id) {
  return _request(`/api/appointments/${id}`, { method: "DELETE" });
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
