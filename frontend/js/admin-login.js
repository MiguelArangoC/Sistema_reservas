/**
 * admin-login.js — Admin authentication for Lumina Studio
 */

const API_BASE = localStorage.getItem("API_BASE") || "http://localhost:5000";

const form       = document.getElementById("admin-login-form");
const errorAlert = document.getElementById("login-error");
const submitBtn  = document.getElementById("login-submit-btn");

// Redirect if already logged in
if (sessionStorage.getItem("adminSession")) {
  window.location.href = "admin.html";
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorAlert.hidden = true;
  submitBtn.textContent = "Verificando…";
  submitBtn.disabled = true;

  const username = document.getElementById("admin-username").value.trim();
  const password = document.getElementById("admin-password").value;

  try {
    const res  = await fetch(`${API_BASE}/api/admin/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Error de autenticación");

    sessionStorage.setItem("adminSession", JSON.stringify({ username, token: data.token }));
    window.location.href = "admin.html";
  } catch (err) {
    errorAlert.hidden = false;
    submitBtn.textContent = "Entrar al panel →";
    submitBtn.disabled = false;
    console.error("Admin login error:", err);
  }
});