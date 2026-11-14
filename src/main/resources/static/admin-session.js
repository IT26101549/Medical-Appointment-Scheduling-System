window.hospitalRequest = async function (url, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("X-Hospital-Request", "HospitalSystem");
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) window.location.replace("/login");
  return response;
};

document.addEventListener("DOMContentLoaded", () => {
  for (const button of document.querySelectorAll(".admin-sign-out")) {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const response = await window.hospitalRequest("/logout", { method: "POST" });
        if (response.status === 204) {
          window.location.replace("/login");
        } else if (response.status !== 401) {
          throw new Error("Sign out failed.");
        }
      } catch {
        button.disabled = false;
        window.alert("Could not sign out. Please try again.");
      }
    });
  }
});
