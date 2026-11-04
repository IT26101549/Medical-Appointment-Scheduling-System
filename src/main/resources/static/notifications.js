window.hospitalNotify = (() => {
  const status = document.createElement("div");
  const alert = document.createElement("div");
  for (const [region, role] of [[status, "status"], [alert, "alert"]]) {
    region.className = "hospital-notification";
    region.setAttribute("role", role);
    region.setAttribute("aria-atomic", "true");
    document.body.append(region);
  }

  let timer;
  return (message, kind = "success") => {
    clearTimeout(timer);
    for (const region of [status, alert]) {
      region.textContent = "";
      delete region.dataset.kind;
    }
    const region = kind === "error" ? alert : status;
    region.dataset.kind = kind;
    region.textContent = message;
    timer = setTimeout(() => {
      region.textContent = "";
      delete region.dataset.kind;
    }, kind === "error" ? 9000 : 6000);
  };
})();
