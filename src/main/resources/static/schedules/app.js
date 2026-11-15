"use strict";

const field = id => document.getElementById(id);
const form = field("entryForm");
const api = "/api/schedules";
const doctorsById = new Map();
const statuses = ["Available", "Booked", "Unavailable"];
const shortDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
let items = [];
let editing = null;
let busy = false;
let doctorsLoaded = false;
let period = new Date();
let view = "list";
let page = 1;
const pageSize = 5;
let schedulesLoaded = false;

function dateKey(date) {
    return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
        .map(value => String(value).padStart(2, "0")).join("-");
}

function shiftDate(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function monday(date) {
    return shiftDate(date, -(date.getDay() + 6) % 7);
}

function make(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
}

async function request(url, options) {
    const response = await window.hospitalRequest(url, options);
    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || `Request failed (${response.status}). Try again.`);
    }
    return response.status === 204 ? null : response.json();
}

function buildForm() {
    for (const definition of window.APP_CONFIG.fields) {
        const {key, label, type} = definition;
        if (key === "doctorName") continue;
        const row = make("div", undefined, "formfield");
        const caption = make("label", (key === "doctorId" ? "Doctor" : label) + " *");
        caption.htmlFor = key;
        const select = key === "doctorId" || type.startsWith("select:");
        const input = make(select ? "select" : "input");
        if (select) {
            const choices = key === "doctorId" ? [] : statuses;
            input.add(new Option(key === "doctorId" ? "Loading doctors…" : "Select availability", ""));
            for (const choice of choices) input.add(new Option(choice, choice));
        } else {
            input.type = type;
            if (type === "date") input.min = dateKey(new Date());
        }
        input.id = input.name = key;
        input.required = true;
        row.append(caption, input);
        row.dataset.field = key;
        field("fields").append(row);
        if (key === "doctorId") {
            const details = make("dl", undefined, "doctor-facts");
            for (const [label, id] of [["Doctor ID", "selected-id"], ["Specialty", "selected-specialty"], ["Room", "selected-room"]]) {
                const fact = make("div");
                const value = make("dd", "—");
                value.id = id;
                fact.append(make("dt", label), value);
                details.append(fact);
            }
            field("fields").append(details);
        }
    }
    field("doctorId").setAttribute("aria-describedby", "doctor-status");
}

function updateControls() {
    field("doctorId").disabled = !doctorsLoaded || !doctorsById.size;
    field("saveBtn").disabled = busy || field("doctorId").disabled;
}

function doctorKey(id) {
    return String(id).replace(/^0+(?=[0-9])/, "");
}

function doctorName(item) {
    return doctorsById.get(doctorKey(item.doctorId))?.name || item.doctorName;
}

function slotStatus(status) {
    const key = String(status ?? "").trim().toLowerCase();
    return statuses.some(option => option.toLowerCase() === key) ? key : "other";
}

function timeRange(item) {
    return item.startTime + "–" + item.endTime;
}

function visibleItems() {
    const query = field("search").value.trim().toLowerCase();
    const doctor = field("doctor-filter").value;
    const date = field("date-filter").value;
    const status = field("availability-filter").value;
    return items.filter(item => (!doctor || doctorKey(item.doctorId) === doctor)
        && (!date || item.date === date) && (!status || slotStatus(item.availability) === status)
        && [doctorName(item), doctorsById.get(doctorKey(item.doctorId))?.room, ...Object.values(item)].some(value => String(value ?? "").toLowerCase().includes(query)))
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.id - b.id);
}

function renderCalendar(records) {
    const month = view === "month";
    const first = month ? new Date(period.getFullYear(), period.getMonth(), 1) : monday(period);
    const start = month ? monday(first) : first;
    const last = month ? new Date(period.getFullYear(), period.getMonth() + 1, 0) : shiftDate(start, 6);
    const days = month ? Math.ceil(((first.getDay() + 6) % 7 + last.getDate()) / 7) * 7 : 7;
    field("week-label").textContent = month
        ? new Intl.DateTimeFormat("en", {month: "long", year: "numeric"}).format(period)
        : shortDate.format(start) + " – " + shortDate.format(last) + ", " + last.getFullYear();
    const calendar = field("calendar-days");
    calendar.replaceChildren();
    for (let offset = 0; offset < days; offset++) {
        const day = shiftDate(start, offset);
        const key = dateKey(day);
        const column = make("section", undefined, "calendar-day");
        column.append(make("h3", new Intl.DateTimeFormat("en", {weekday: "short", month: "short", day: "numeric"}).format(day)));
        if (month && day.getMonth() !== period.getMonth()) column.classList.add("other-month");
        if (key === dateKey(new Date())) column.classList.add("calendar-today");
        const slots = records.filter(item => item.date === key);
        for (const item of slots) {
            const button = make("button", undefined, "calendar-slot");
            button.type = "button";
            button.dataset.status = slotStatus(item.availability);
            button.append(make("strong", timeRange(item)), make("span", doctorName(item)), make("small", item.availability));
            button.addEventListener("click", () => startEdit(item));
            column.append(button);
        }
        if (!slots.length) column.append(make("p", "No slots", "schedule-hint"));
        calendar.append(column);
    }
}

function render() {
    field("count").textContent = schedulesLoaded ? items.length : "—";
    field("today-count").textContent = schedulesLoaded ? items.filter(item => item.date === dateKey(new Date())).length : "—";
    field("active-count").textContent = doctorsLoaded
        ? [...doctorsById.values()].filter(doctor => String(doctor.status).trim().toLowerCase() === "active").length
        : "—";
    statuses.forEach((status, index) => {
        field("metric-" + (index + 1)).textContent = schedulesLoaded ? items.filter(item => slotStatus(item.availability) === status.toLowerCase()).length : "—";
    });
    const records = visibleItems();
    const table = field("tableBody");
    table.replaceChildren();
    field("empty").hidden = records.length > 0 || !schedulesLoaded;
    const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
    page = Math.min(page, totalPages);
    const first = (page - 1) * pageSize;
    const last = Math.min(first + pageSize, records.length);
    field("page-count").textContent = schedulesLoaded
        ? (records.length ? "Showing " + (first + 1) + "–" + last + " of " + records.length : "0 schedules")
        : "Schedule data unavailable";
    field("previous-page").disabled = page <= 1;
    field("next-page").disabled = page >= totalPages;
    for (const item of records.slice(first, last)) {
        const row = make("tr");
        const doctor = doctorsById.get(doctorKey(item.doctorId));
        const name = make("td");
        name.append(make("strong", doctorName(item)));
        if (doctor?.specialization) name.append(make("small", doctor.specialization, "table-specialty"));
        row.append(make("td", "#" + item.id), make("td", item.doctorId), name);
        for (const value of [item.date, item.startTime, item.endTime, doctor?.room || "—"]) row.append(make("td", value));
        const status = make("td");
        const badge = make("span", item.availability, "schedule-badge");
        badge.dataset.status = slotStatus(item.availability);
        status.append(badge);
        const actions = make("td", undefined, "schedule-actions");
        const edit = make("button", "Edit", "btn-sm");
        const remove = make("button", "Delete", "btn-sm delete");
        edit.type = remove.type = "button";
        edit.addEventListener("click", () => startEdit(item));
        remove.addEventListener("click", () => deleteSlot(item));
        actions.append(edit, remove);
        row.append(status, actions);
        table.append(row);
    }
    if (view !== "list") renderCalendar(records);
}

async function refresh() {
    const [schedules, doctors] = await Promise.allSettled([request(api), request("/api/doctors")]);
    if (schedules.status === "fulfilled") {
        items = schedules.value;
        schedulesLoaded = true;
    }
    if (doctors.status === "fulfilled") {
        doctorsLoaded = true;
        doctorsById.clear();
        const select = field("doctorId");
        const selected = select.value;
        select.replaceChildren(new Option("Select a doctor", ""));
        for (const doctor of doctors.value) {
            const id = String(doctor.id);
            doctorsById.set(id, doctor);
            select.add(new Option(doctor.name + " (#" + id + ")" + (doctor.specialization ? " – " + doctor.specialization : ""), id));
        }
        select.value = doctorsById.has(selected) ? selected : "";
        field("doctor-status").textContent = doctorsById.size ? "" : "Add a doctor in Doctor Management before creating a schedule.";
    } else {
        doctorsLoaded = false;
        field("doctor-status").textContent = "Could not load doctors. Use Refresh to try again.";
    }
    const filter = field("doctor-filter");
    const selectedFilter = filter.value;
    const options = new Map([...doctorsById].map(([id, doctor]) => [id, doctor.name]));
    for (const item of items) options.set(doctorKey(item.doctorId), doctorName(item));
    filter.replaceChildren(new Option("All doctors", ""));
    for (const [id, name] of options) filter.add(new Option(name + " (#" + id + ")", id));
    filter.value = options.has(selectedFilter) ? selectedFilter : "";
    updateControls();
    updateDoctorFacts();
    render();
    if (schedules.status === "rejected") window.hospitalNotify(schedules.reason.message, "error");
}

function updateDoctorFacts() {
    const id = field("doctorId").value;
    const doctor = doctorsById.get(id);
    field("selected-id").textContent = doctor ? "#" + id : "—";
    field("selected-specialty").textContent = doctor?.specialization || "—";
    field("selected-room").textContent = doctor?.room || "—";
}

function clearForm() {
    form.reset();
    updateDoctorFacts();
    editing = null;
    field("formHeading").textContent = "Add Doctor Schedule";
    field("saveBtn").textContent = "Save Schedule";
    field("doctor-status").textContent = !doctorsLoaded ? "Could not load doctors. Use Refresh to try again."
        : doctorsById.size ? "" : "Add a doctor in Doctor Management before creating a schedule.";
}

function startEdit(item) {
    if (busy) return;
    clearForm();
    editing = item.id;
    const doctorId = doctorKey(item.doctorId);
    if (doctorsById.has(doctorId)) field("doctorId").value = doctorId;
    else if (doctorsLoaded && doctorsById.size) field("doctor-status").textContent = "Select a current doctor to update this schedule.";
    for (const key of ["date", "startTime", "endTime"]) field(key).value = item[key];
    field("availability").value = statuses.find(status => status.toLowerCase() === slotStatus(item.availability)) || "";
    updateDoctorFacts();
    field("formHeading").textContent = "Edit Schedule #" + item.id;
    field("saveBtn").textContent = "Save Changes";
    window.hospitalNotify("Editing doctor schedule #" + item.id + ".", "info");
    field("formHeading").scrollIntoView({block: "center"});
}

async function deleteSlot(item) {
    if (busy) return;
    busy = true;
    updateControls();
    try {
        const removed = await window.confirmHospitalDelete({
            record: "schedule",
            name: doctorName(item),
            details: [item.date, timeRange(item), item.availability].join(" · "),
        }, () => request(api + "/" + item.id, {method: "DELETE"}));
        if (!removed) return;
        if (editing === item.id) clearForm();
        await refresh();
        window.hospitalNotify("Doctor schedule deleted successfully.");
    } finally {
        busy = false;
        updateControls();
    }
}

form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !doctorsById.has(field("doctorId").value)) return;
    const payload = Object.fromEntries(new FormData(form));
    busy = true;
    updateControls();
    try {
        const isNew = editing === null;
        await request(isNew ? api : api + "/" + editing, {
            method: isNew ? "POST" : "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload),
        });
        clearForm();
        period = new Date(payload.date + "T12:00:00");
        await refresh();
        window.hospitalNotify(isNew ? "Doctor schedule added successfully." : "Doctor schedule changes saved.");
    } catch (error) {
        window.hospitalNotify(error.message, "error");
    } finally {
        busy = false;
        updateControls();
    }
});

for (const [id, delta] of [["previous-week", -1], ["today-week", 0], ["next-week", 1]]) {
    field(id).addEventListener("click", () => {
        period = !delta ? new Date() : view === "month" 
            ? new Date(period.getFullYear(), period.getMonth() + delta, 1) : shiftDate(period, delta * 7);
        renderCalendar(visibleItems());
    });
}
for (const button of document.querySelectorAll("[data-view]")) {
    button.addEventListener("click", () => {
        view = button.dataset.view;
        for (const tab of document.querySelectorAll("[data-view]")) {
            const active = tab === button;
            tab.className = active ? "primary" : "secondary";
            tab.setAttribute("aria-pressed", String(active));
        }
        field("list-view").hidden = view !== "list";
        field("calendar-view").hidden = view === "list";
        field("results-title").textContent = {list: "Doctor Schedules List", week: "Weekly Schedule", month: "Monthly Schedule"}[view];
        render();
    });
}
for (const id of ["doctor-filter", "date-filter", "availability-filter", "search"]) {
    field(id).addEventListener(id === "search" ? "input" : "change", () => {
        page = 1;
        if (id === "date-filter" && field(id).value) period = new Date(field(id).value + "T12:00:00");
        render();
    });
}
field("previous-page").addEventListener("click", () => { page--; render(); });
field("next-page").addEventListener("click", () => { page++; render(); });
field("schedule-today").textContent = new Intl.DateTimeFormat("en-GB", { dateStyle: "full" }).format(new Date());
field("resetBtn").addEventListener("click", clearForm);
field("refresh").addEventListener("click", refresh);
const header = make("tr");
for (const label of ["#", "Doctor ID", "Doctor Name", "Date", "Start", "End", "Room", "Availability", "Actions"]) {
    const th = make("th", label);
    th.scope = "col";
    header.append(th);
}
field("tableHead").append(header);
buildForm();
field("doctorId").addEventListener("change", updateDoctorFacts);
updateControls();
render();
refresh();


