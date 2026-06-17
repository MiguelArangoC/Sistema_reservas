import { loginProfessional } from "./api.js";

const loginForm = document.getElementById("login-form");
const errorAlert = document.getElementById("login-error");

if (sessionStorage.getItem("professionalSession")) {
  window.location.href = "professional.html";
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorAlert.hidden = true;

  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const data = await loginProfessional(username, password);

    if (data.role === "admin") {
      window.location.href = "admin.html";
      return;
    }

    sessionStorage.setItem("professionalSession", JSON.stringify(data.professional));
    window.location.href = "professional.html";
  } catch (err) {
    errorAlert.hidden = false;
    console.error("Login error:", err);
  }
});
