const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

export function getApiBase() {
  const configuredBase = localStorage.getItem("API_BASE");
  if (configuredBase) return configuredBase.replace(/\/$/, "");

  if (
    window.location.protocol === "file:" ||
    LOCAL_HOSTS.has(window.location.hostname)
  ) {
    return "http://localhost:5000";
  }

  return window.location.origin;
}
