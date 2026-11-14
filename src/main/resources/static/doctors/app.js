/* Doctor Management UI. The Java model, JSON keys and /api/doctors contract come from the base project. */
(() => {
  "use strict";
  const cfg = window.APP_CONFIG;
  const api = "/api/" + cfg.plural;
  const page = document.body.dataset.page;
  const $ = (id) => document.getElementById(id);
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const normalize = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase();
  const icon = (name) =>
    '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-' +
    name +
    '"></use></svg>';
  const link = (file, id) => file + "?id=" + encodeURIComponent(id);
  let items = [],
    currentPage = 1,
    loading = false,
    hasData = false,
    editingId = null,
    saving = false,
    formReady = false;
  const pageSize = 9;
  let view = "grid";
  try {
    if (localStorage.getItem("doctorManagement.directoryView") === "list")
      view = "list";
  } catch (_) {
    /* Storage is optional. */
  }

  function showMessage(message, error = false) {
    window.hospitalNotify(message, error ? "error" : "success");
  }

  async function request(path, options = {}) {
    let response;
    try {
      response = await window.hospitalRequest(path, {
        ...options,
        headers: { Accept: "application/json", ...options.headers },
      });
    } catch (_) {
      throw new Error(
        "Cannot reach the server. Check that HospitalSystem is running, then try again.",
      );
    }
    if (!response.ok) {
      let message =
        response.status === 404
          ? "This doctor could not be found. The record may have been removed."
          : "The request failed (" + response.status + "). Please try again.";
      try {
        const data = await response.json();
        if (data.error && response.status !== 404) message = data.error;
      } catch (_) {
        /* Some errors have no JSON body. */
      }
      throw new Error(message);
    }
    if (response.status === 204) return null;
    try {
      return await response.json();
    } catch (_) {
      throw new Error(
        "The server returned an unexpected response. Please try again.",
      );
    }
  }

  function initials(name) {
    const words = String(name || "")
      .replace(/^dr\.?\s+/i, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return (
      words.length > 1
        ? words[0][0] + words[words.length - 1][0]
        : (words[0] || "D").slice(0, 2)
    ).toUpperCase();
  }
  function avatar(it, extra = "") {
    return (
      '<span class="avatar avatar-tone-' +
      (Number(it.id) % 4) +
      " " +
      extra +
      '" aria-hidden="true">' +
      esc(initials(it.name)) +
      "</span>"
    );
  }
  function status(value) {
    const type =
      { active: "", "on leave": "status-leave", inactive: "status-inactive" }[
        normalize(value)
      ] ?? "status-custom";
    return (
      '<span class="status ' +
      type +
      '"><span>' +
      esc(value || "Not set") +
      "</span></span>"
    );
  }
  function state(title, text, action = "", symbol = "doctor") {
    return (
      '<div class="state-panel">' +
      icon(symbol) +
      "<h2>" +
      esc(title) +
      "</h2><p>" +
      esc(text) +
      "</p>" +
      action +
      "</div>"
    );
  }
  function errorPanel(target, error, retry) {
    target.innerHTML = state(
      "We couldn't load this page",
      error.message,
      '<button class="button primary retry-button" type="button">' +
        icon("refresh") +
        ' Try again</button><a class="button secondary" href="index.html">Doctor directory</a>',
      "info",
    );
    target.setAttribute("aria-busy", "false");
    target.querySelector(".retry-button").addEventListener("click", retry);
  }
  function recordId() {
    const value = new URLSearchParams(location.search).get("id");
    if (
      value === null ||
      !/^[1-9]\d*$/.test(value) ||
      !Number.isSafeInteger(Number(value))
    )
      throw new Error("Open a valid doctor profile from the directory.");
    return Number(value);
  }
  function counts() {
    return {
      total: items.length,
      active: items.filter((d) => normalize(d.status) === "active").length,
      leave: items.filter((d) => normalize(d.status) === "on leave").length,
      specialties: new Set(
        items.map((d) => normalize(d.specialization)).filter(Boolean),
      ).size,
    };
  }
  function updateMetrics() {
    for (const [key, value] of Object.entries(counts()))
      if ($("metric-" + key)) $("metric-" + key).textContent = value;
  }
  function setMetricsUnavailable() {
    for (const key of ["total", "active", "leave", "specialties"])
      if ($("metric-" + key)) $("metric-" + key).textContent = "—";
  }
  function populateFilters() {
    for (const [id, key, label] of [
      ["statusFilter", "status", "All statuses"],
      ["specializationFilter", "specialization", "All specializations"],
    ]) {
      const select = $(id),
        selected = select.value;
      const values = new Map();
      for (const item of items)
        if (normalize(item[key]))
          values.set(normalize(item[key]), item[key].trim());
      select.replaceChildren(new Option(label, ""));
      [...values]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .forEach(([value, text]) => select.add(new Option(text, value)));
      if (values.has(selected)) select.value = selected;
    }
  }
  function card(it) {
    const name = esc(it.name);
    return (
      '<article class="doctor-card"><div class="card-top">' +
      avatar(it) +
      status(it.status) +
      '</div><h3><a href="' +
      link("details.html", it.id) +
      '">' +
      name +
      '</a></h3><p class="specialty">' +
      esc(it.specialization) +
      '</p><p class="doctor-id">Doctor #' +
      esc(it.id) +
      '</p><div class="card-contact"><div class="contact-line">' +
      icon("mail") +
      '<span title="' +
      esc(it.email) +
      '">' +
      esc(it.email) +
      '</span></div><div class="contact-line">' +
      icon("phone") +
      "<span>" +
      esc(it.phone) +
      '</span></div><div class="contact-line">' +
      icon("room") +
      "<span>" +
      esc(it.room || "Room not assigned") +
      '</span></div></div><div class="card-footer"><a class="profile-link" href="' +
      link("details.html", it.id) +
      '">View profile ' +
      icon("arrow") +
      '</a><div class="card-actions"><a class="icon-button" title="Edit doctor" aria-label="Edit ' +
      name +
      '" href="' +
      link("form.html", it.id) +
      '">' +
      icon("edit") +
      '</a><a class="icon-button" title="Remove doctor" aria-label="Remove ' +
      name +
      '" href="' +
      link("delete.html", it.id) +
      '">' +
      icon("trash") +
      "</a></div></div></article>"
    );
  }
  function table(records, compact = false) {
    const rows = records
      .map(
        (it) =>
          '<tr><td><a class="table-person" href="' +
          link("details.html", it.id) +
          '">' +
          avatar(it, "small-avatar") +
          "<span><strong>" +
          esc(it.name) +
          "</strong><small>Doctor #" +
          esc(it.id) +
          "</small></span></a></td><td>" +
          esc(it.specialization) +
          "</td>" +
          (compact
            ? ""
            : "<td>" +
              esc(it.email) +
              '<span class="table-secondary">' +
              esc(it.phone) +
              "</span></td><td>" +
              esc(it.room || "Not assigned") +
              "</td>") +
          "<td>" +
          status(it.status) +
          '</td><td><div class="table-actions"><a class="icon-button" aria-label="View ' +
          esc(it.name) +
          '" href="' +
          link("details.html", it.id) +
          '">' +
          icon("arrow") +
          "</a>" +
          (compact
            ? ""
            : '<a class="icon-button" aria-label="Edit ' +
              esc(it.name) +
              '" href="' +
              link("form.html", it.id) +
              '">' +
              icon("edit") +
              "</a>") +
          "</div></td></tr>",
      )
      .join("");
    return (
      '<div class="table-scroll"><table><caption class="sr-only">Doctor directory</caption><thead><tr><th scope="col">Doctor</th><th scope="col">Specialization</th>' +
      (compact ? "" : '<th scope="col">Contact</th><th scope="col">Room</th>') +
      '<th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
      rows +
      "</tbody></table></div>"
    );
  }
  function render() {
    if (!hasData) return;
    const query = normalize($("search").value),
      selectedStatus = $("statusFilter").value,
      specialty = $("specializationFilter").value;
    const filtered = items.filter(
      (it) =>
        (!selectedStatus || normalize(it.status) === selectedStatus) &&
        (!specialty || normalize(it.specialization) === specialty) &&
        (!query ||
          [it.id, ...cfg.fields.map((f) => it[f.key])].some((v) =>
            normalize(v).includes(query),
          )),
    );
    const sort = $("sortBy").value;
    filtered.sort((a, b) =>
      sort === "newest"
        ? b.id - a.id
        : sort === "specialization"
          ? a.specialization.localeCompare(b.specialization) ||
            a.name.localeCompare(b.name)
          : a.name.localeCompare(b.name),
    );
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    currentPage = Math.min(currentPage, pages);
    const start = (currentPage - 1) * pageSize,
      visible = filtered.slice(start, start + pageSize);
    $("clearFilters").hidden = !query && !selectedStatus && !specialty;
    $("resultCount").textContent = filtered.length
      ? "Showing " +
        (start + 1) +
        "–" +
        (start + visible.length) +
        " of " +
        filtered.length +
        " doctors" +
        (filtered.length !== items.length
          ? " · " + items.length + " total"
          : "")
      : "0 doctors";
    for (const type of ["grid", "list"]) {
      $(type + "View").classList.toggle("selected", view === type);
      $(type + "View").setAttribute("aria-pressed", String(view === type));
    }
    const container = $("directoryContent");
    if (!items.length)
      container.innerHTML = state(
        "Your team starts here",
        "Add your first doctor to create a clear, connected directory for your medical team.",
        '<a class="button primary" href="form.html">' +
          icon("plus") +
          " Add your first doctor</a>",
      );
    else if (!filtered.length) {
      container.innerHTML = state(
        "No doctors match your search",
        "Try another name, room, specialization or status.",
        '<button class="button secondary" id="emptyClear" type="button">Clear filters</button>',
        "search",
      );
      $("emptyClear").addEventListener("click", resetFilters);
    } else
      container.innerHTML =
        view === "grid"
          ? '<div class="doctor-grid">' + visible.map(card).join("") + "</div>"
          : '<div class="table-panel">' + table(visible) + "</div>";
    container.setAttribute("aria-busy", "false");
    $("pagination").hidden = pages <= 1;
    $("pageSummary").textContent = "Page " + currentPage + " of " + pages;
    $("previousPage").disabled = currentPage <= 1;
    $("nextPage").disabled = currentPage >= pages;
  }
  function resetFilters() {
    $("search").value = "";
    $("statusFilter").value = "";
    $("specializationFilter").value = "";
    currentPage = 1;
    render();
  }
  function renderOverview() {
    const target = $("overviewContent"),
      total = items.length;
    const specialties = new Map(),
      statuses = new Map();
    for (const it of items) {
      const key = normalize(it.specialization),
        entry = specialties.get(key) || { label: it.specialization, count: 0 };
      entry.count++;
      specialties.set(key, entry);
      const s = normalize(it.status),
        group = statuses.get(s) || { label: it.status, count: 0 };
      group.count++;
      statuses.set(s, group);
    }
    let bars = [...specialties.values()]
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .map(
        (entry) =>
          '<div><div class="bar-label"><span>' +
          esc(entry.label) +
          "</span><strong>" +
          entry.count +
          (entry.count === 1 ? " doctor" : " doctors") +
          '</strong></div><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:' +
          ((entry.count / Math.max(1, total)) * 100).toFixed(2) +
          '%"></div></div></div>',
      )
      .join("");
    let groups = [...statuses.values()]
      .sort((a, b) => b.count - a.count)
      .map(
        (s) =>
          '<div class="status-row">' +
          status(s.label) +
          "<strong>" +
          s.count +
          "</strong></div>",
      )
      .join("");
    target.innerHTML =
      '<div class="overview-grid"><section class="panel chart-panel"><h2>Expertise across your team</h2><p class="panel-subtitle">Doctors grouped by specialization</p><div class="breakdown">' +
      (bars ||
        '<p class="inline-empty">Specializations appear when you add doctors.</p>') +
      '</div></section><section class="panel chart-panel"><h2>Team status</h2><p class="panel-subtitle">A snapshot of your saved doctor statuses</p>' +
      (groups ||
        '<p class="inline-empty">Your team status will appear here.</p>') +
      '<p class="status-note">Keep each profile up to date for an accurate view of your team.</p></section></div><section class="panel latest-panel"><div class="section-heading"><div><h2>Latest additions</h2><p>Your most recently added doctors</p></div><a class="profile-link" href="index.html">View all ' +
      icon("arrow") +
      "</a></div>" +
      (total
        ? table([...items].sort((a, b) => b.id - a.id).slice(0, 5), true)
        : state(
            "Make room for your first doctor",
            "Build your team directory one profile at a time.",
            '<a class="button primary" href="form.html">' +
              icon("plus") +
              " Add doctor</a>",
          )) +
      "</section>";
    target.setAttribute("aria-busy", "false");
  }
  async function refresh() {
    if (loading) return;
    loading = true;
    $("refresh").disabled = true;
    const target = $(
      page === "directory" ? "directoryContent" : "overviewContent",
    );
    target.setAttribute("aria-busy", "true");
    if ($("syncState")) $("syncState").textContent = "Updating…";
    try {
      const data = await request(api);
      if (!Array.isArray(data))
        throw new Error("The server returned an unexpected doctor list.");
      items = data;
      hasData = true;
      updateMetrics();
      if (page === "directory") {
        populateFilters();
        render();
        $("syncState").textContent = "Updated just now";
      } else renderOverview();
    } catch (error) {
      hasData = false;
      setMetricsUnavailable();
      errorPanel(target, error, refresh);
      if ($("syncState")) $("syncState").textContent = "Connection issue";
      if ($("pagination")) $("pagination").hidden = true;
      if ($("resultCount"))
        $("resultCount").textContent = "Doctors unavailable";
    } finally {
      loading = false;
      $("refresh").disabled = false;
    }
  }

  function buildForm() {
    const sections = [
      [
        "Professional details",
        "Introduce the person behind the profile.",
        "doctor",
        ["name", "specialization"],
      ],
      [
        "Contact information",
        "Keep your doctor easy to reach.",
        "phone",
        ["email", "phone"],
      ],
      [
        "Clinic details",
        "Help your team find the right place and status.",
        "room",
        ["room", "status"],
      ],
    ];
    const placeholders = {
      name: "e.g. Dr. A. Perera",
      specialization: "e.g. Cardiology",
      email: "name@example.com",
      phone: "0771234567",
      room: "e.g. Room 204",
    };
    const hints = {
      phone: "Sri Lankan mobile: 0771234567 or +94771234567.",
      room: "Optional — you can assign a room later.",
    };
    $("fields").innerHTML = sections
      .map(
        ([title, help, symbol, keys]) =>
          '<section class="form-section"><h2 class="form-section-title">' +
          icon(symbol) +
          esc(title) +
          "</h2><p>" +
          esc(help) +
          '</p><div class="form-fields">' +
          keys
            .map((key) => {
              const f = cfg.fields.find((field) => field.key === key);
              let input;
              if (f.type.startsWith("select:"))
                input =
                  '<select id="' +
                  key +
                  '" name="' +
                  key +
                  '" required aria-describedby="' +
                  key +
                  '-error"><option value="">Select status</option>' +
                  f.type
                    .slice(7)
                    .split("|")
                    .map(
                      (v) =>
                        '<option value="' +
                        esc(v) +
                        '">' +
                        esc(v) +
                        "</option>",
                    )
                    .join("") +
                  "</select>";
              else
                input =
                  '<input id="' +
                  key +
                  '" name="' +
                  key +
                  '" type="' +
                  f.type +
                  '" placeholder="' +
                  esc(placeholders[key]) +
                  '"' +
                  (f.required ? " required" : "") +
                  (key === "email"
                    ? ' maxlength="254" autocomplete="email"'
                    : key === "phone"
                      ? ' autocomplete="tel" inputmode="tel"'
                      : key === "name"
                        ? ' autocomplete="name"'
                        : "") +
                  ' aria-describedby="' +
                  key +
                  "-error" +
                  (hints[key] ? " " + key + "-hint" : "") +
                  '">';
              return (
                '<div class="formfield"><label for="' +
                key +
                '">' +
                esc(f.label) +
                (f.required
                  ? '<span class="required" aria-hidden="true">*</span>'
                  : "") +
                "</label>" +
                input +
                (hints[key]
                  ? '<span class="field-hint" id="' +
                    key +
                    '-hint">' +
                    esc(hints[key]) +
                    "</span>"
                  : "") +
                '<p class="field-error" id="' +
                key +
                '-error" hidden></p></div>'
              );
            })
            .join("") +
          "</div></section>",
      )
      .join("");
    $("status").value = "Active";
    $("entryForm").addEventListener("input", (e) => {
      if (e.target.id && $(e.target.id + "-error")) {
        $(e.target.id + "-error").hidden = true;
        e.target.removeAttribute("aria-invalid");
      }
    });
  }
  function clearForm() {
    $("entryForm").reset();
    $("status").value = "Active";
    $("formError").hidden = true;
    cfg.fields.forEach((f) => {
      $(f.key).removeAttribute("aria-invalid");
      $(f.key + "-error").hidden = true;
    });
  }
  function startEdit(it) {
    editingId = it.id;
    for (const f of cfg.fields) {
      const input = $(f.key);
      if (
        input.tagName === "SELECT" &&
        it[f.key] &&
        ![...input.options].some((o) => o.value === it[f.key])
      )
        input.add(new Option(it[f.key], it[f.key]));
      input.value = it[f.key] ?? "";
    }
    $("pageTitle").textContent = "Edit doctor";
    $("pageIntro").textContent = "Update the details for " + it.name + ".";
    $("saveBtn").textContent = "Save changes";
    $("cancelForm").href = link("details.html", it.id);
    document.title = "Edit " + it.name + " · Doctor Management";
  }
  function formBusy(busy) {
    $("entryForm")
      .querySelectorAll("input,select,button")
      .forEach((el) => {
        el.disabled = busy;
      });
    $("saveBtn").textContent = busy
      ? "Saving…"
      : editingId === null
        ? "Save doctor"
        : "Save changes";
  }
  function validate(payload) {
    let first = null;
    for (const f of cfg.fields) {
      let error =
        f.required && !payload[f.key] ? f.label + " is required." : "";
      if (
        !error &&
        f.key === "email" &&
        (payload.email.length > 254 ||
          payload.email.includes("..") ||
          !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(
            payload.email,
          ))
      )
        error = "Enter a valid email address, such as name@example.com.";
      if (
        !error &&
        f.key === "phone" &&
        !/^(?:07[0-9]{8}|\+947[0-9]{8})$/.test(payload.phone)
      )
        error = "Use 0771234567 or +94771234567.";
      const input = $(f.key),
        message = $(f.key + "-error");
      message.textContent = error;
      message.hidden = !error;
      if (error) {
        input.setAttribute("aria-invalid", "true");
        first ||= input;
      } else input.removeAttribute("aria-invalid");
    }
    if (first) {
      first.focus();
      return false;
    }
    return true;
  }
  async function saveForm(event) {
    event.preventDefault();
    if (saving || !formReady) return;
    const payload = Object.fromEntries(
      cfg.fields.map((f) => [f.key, $(f.key).value.trim()]),
    );
    $("formError").hidden = true;
    if (!validate(payload)) return;
    saving = true;
    formBusy(true);
    try {
      const result = await request(
        editingId === null ? api : api + "/" + editingId,
        {
          method: editingId === null ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!Number.isSafeInteger(result.id) || result.id < 1)
        throw new Error(
          "Saved, but the server returned an unexpected doctor ID. Refresh the directory before trying again.",
        );
      location.assign(
        link("details.html", result.id) +
          "&saved=" +
          (editingId === null ? "created" : "updated"),
      );
    } catch (error) {
      $("formError").textContent = error.message;
      $("formError").hidden = false;
      $("formError").focus();
      showMessage(error.message, true);
    } finally {
      saving = false;
      formBusy(false);
    }
  }
  async function loadForm() {
    formReady = false;
    $("saveBtn").disabled = true;
    $("formLoadError").hidden = true;
    $("formLayout").hidden = false;
    try {
      if (new URLSearchParams(location.search).has("id")) {
        const id = recordId();
        formBusy(true);
        startEdit(await request(api + "/" + id));
        window.hospitalNotify("Editing doctor #" + id + ".", "info");
      }
      formReady = true;
      formBusy(false);
    } catch (error) {
      $("formLayout").hidden = true;
      $("formLoadError").hidden = false;
      errorPanel($("formLoadError"), error, loadForm);
    }
  }
  async function loadDetails() {
    const target = $("detailContent");
    target.setAttribute("aria-busy", "true");
    try {
      const it = await request(api + "/" + recordId());
      document.title = it.name + " · Doctor Management";
      target.innerHTML =
        '<section class="profile-hero"><div class="profile-cover" aria-hidden="true"></div><div class="profile-summary">' +
        avatar(it, "profile-avatar") +
        '<div class="profile-heading"><div><h1>' +
        esc(it.name) +
        '</h1><p class="profile-specialty">' +
        esc(it.specialization) +
        '</p><div class="profile-meta"><span>Doctor #' +
        esc(it.id) +
        "</span>" +
        status(it.status) +
        '</div></div><div class="profile-actions"><a class="button secondary" href="' +
        link("delete.html", it.id) +
        '">' +
        icon("trash") +
        ' Remove</a><a class="button primary" href="' +
        link("form.html", it.id) +
        '">' +
        icon("edit") +
        ' Edit profile</a></div></div></div></section><div class="profile-grid"><section class="panel info-panel"><h2>' +
        icon("phone") +
        ' Contact information</h2><dl><div class="detail-row"><dt>Email address</dt><dd><a href="mailto:' +
        esc(encodeURIComponent(it.email)) +
        '">' +
        esc(it.email) +
        '</a></dd></div><div class="detail-row"><dt>Mobile number</dt><dd><a href="tel:' +
        esc(encodeURIComponent(it.phone)) +
        '">' +
        esc(it.phone) +
        '</a></dd></div></dl></section><section class="panel info-panel"><h2>' +
        icon("room") +
        ' Clinic details</h2><dl><div class="detail-row"><dt>Specialization</dt><dd>' +
        esc(it.specialization) +
        '</dd></div><div class="detail-row"><dt>Consultation room</dt><dd>' +
        esc(it.room || "Not assigned") +
        '</dd></div><div class="detail-row"><dt>Doctor status</dt><dd>' +
        status(it.status) +
        "</dd></div></dl></section></div>";
    } catch (error) {
      errorPanel(target, error, loadDetails);
    } finally {
      target.setAttribute("aria-busy", "false");
    }
  }
  async function remove(it) {
    if (saving || !$("confirmDelete").checked) return;
    saving = true;
    $("deleteBtn").disabled = true;
    $("confirmDelete").disabled = true;
    $("deleteBtn").textContent = "Removing…";
    $("deleteError").hidden = true;
    try {
      await request(api + "/" + it.id, { method: "DELETE" });
      location.assign("index.html?deleted=1");
    } catch (error) {
      $("deleteError").textContent = error.message;
      $("deleteError").hidden = false;
      $("deleteError").focus();
      showMessage(error.message, true);
    } finally {
      saving = false;
      $("deleteBtn").disabled = false;
      $("confirmDelete").disabled = false;
      $("deleteBtn").textContent = "Remove doctor";
    }
  }
  async function loadDelete() {
    const target = $("deleteContent");
    target.setAttribute("aria-busy", "true");
    try {
      const it = await request(api + "/" + recordId());
      $("deleteBack").href = link("details.html", it.id);
      $("deleteBack").innerHTML = icon("back") + " Back to profile";
      target.innerHTML =
        '<section class="panel delete-panel"><div class="delete-symbol">' +
        icon("trash") +
        '</div><p class="eyebrow">REMOVE A RECORD</p><h1>Remove this doctor?</h1><p>This will permanently remove this doctor from your directory.<br>This action cannot be undone.</p><div class="delete-person">' +
        avatar(it) +
        "<div><strong>" +
        esc(it.name) +
        "</strong><p>" +
        esc(it.specialization) +
        " · Doctor #" +
        esc(it.id) +
        '</p></div></div><div id="deleteError" class="form-message" role="alert" tabindex="-1" hidden></div><label class="delete-confirm"><input type="checkbox" id="confirmDelete"> I understand that this doctor record will be permanently removed.</label><div class="delete-actions"><a class="button secondary" href="' +
        link("details.html", it.id) +
        '">Keep doctor</a><button class="button primary" id="deleteBtn" type="button" disabled>' +
        icon("trash") +
        " Remove doctor</button></div></section>";
      $("confirmDelete").addEventListener("change", () => {
        $("deleteBtn").disabled = !$("confirmDelete").checked;
      });
      $("deleteBtn").addEventListener("click", () => remove(it));
    } catch (error) {
      errorPanel(target, error, loadDelete);
    } finally {
      target.setAttribute("aria-busy", "false");
    }
  }

  if (page === "directory") {
    ["search", "statusFilter", "specializationFilter", "sortBy"].forEach((id) =>
      $(id).addEventListener(id === "search" ? "input" : "change", () => {
        currentPage = 1;
        if (!loading) render();
      }),
    );
    $("clearFilters").addEventListener("click", resetFilters);
    ["grid", "list"].forEach((type) =>
      $(type + "View").addEventListener("click", () => {
        view = type;
        try {
          localStorage.setItem("doctorManagement.directoryView", view);
        } catch (_) {
          /* Optional preference. */
        }
        if (!loading) render();
      }),
    );
    $("previousPage").addEventListener("click", () => {
      currentPage--;
      render();
    });
    $("nextPage").addEventListener("click", () => {
      currentPage++;
      render();
    });
    $("refresh").addEventListener("click", refresh);
    refresh();
    if (new URLSearchParams(location.search).get("deleted") === "1") {
      showMessage("Doctor deleted successfully.");
      history.replaceState(null, "", location.pathname);
    }
  } else if (page === "overview") {
    $("refresh").addEventListener("click", refresh);
    refresh();
  } else if (page === "form") {
    $("refresh").hidden = true;
    buildForm();
    $("entryForm").addEventListener("submit", saveForm);
    loadForm();
  } else if (page === "details") {
    const url = new URL(location.href);
    const saved = url.searchParams.get("saved");
    if (saved === "created" || saved === "updated") {
      showMessage(saved === "created" ? "Doctor added successfully." : "Doctor profile updated.");
      url.searchParams.delete("saved");
      history.replaceState(history.state, "", url);
    }
    $("refresh").addEventListener("click", loadDetails);
    loadDetails();
  } else if (page === "delete") {
    $("refresh").hidden = true;
    loadDelete();
  }
})();
