'use strict';

const today = new Date();
const shortDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
const weekday = new Intl.DateTimeFormat('en', { weekday: 'short' });
const element = id => document.getElementById(id);

function dateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
}

const todayKey = dateKey(today);
const todayLabel = element('today');
todayLabel.dateTime = todayKey;
todayLabel.textContent = new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(today);

const monday = new Date(today);
monday.setDate(today.getDate() - (today.getDay() + 6) % 7);
const days = Array.from({ length: 7 }, (_, index) => {
  const day = new Date(monday);
  day.setDate(monday.getDate() + index);
  return day;
});
element('week-range').textContent = shortDate.format(days[0]) + ' – ' + shortDate.format(days[6]);

async function loadList(route) {
  // Dashboard totals only need same-origin reads. Keep them working if the session script fails to load.
  const response = await fetch('/api/' + route, { headers: { Accept: 'application/json' } });
  if (response.status === 401) {
    window.location.replace('/login');
    throw new Error('Sign-in required');
  }
  if (!response.ok) throw new Error(route + ' request failed');
  const records = await response.json();
  if (!Array.isArray(records)) throw new Error(route + ' returned an unexpected response');
  return records;
}

function renderAppointments(records) {
  const active = records.filter(record => String(record.status).toLowerCase() !== 'cancelled');
  const agenda = active.filter(record => record.date === todayKey)
    .sort((first, second) => String(first.time).localeCompare(String(second.time)));
  element('appointment-total').textContent = agenda.length;
  for (const appointment of agenda) {
    const item = document.createElement('li');
    const time = document.createElement('time');
    time.textContent = appointment.time || '—';
    const details = document.createElement('div');
    const patient = document.createElement('strong');
    patient.textContent = appointment.patientName || 'Patient';
    const doctor = document.createElement('small');
    doctor.textContent = appointment.doctorName || 'Doctor';
    details.append(patient, doctor);
    item.append(time, details);
    element('today-list').append(item);
  }
  const agendaState = element('agenda-state');
  agendaState.textContent = 'No appointments today.';
  agendaState.hidden = agenda.length > 0;

  const totals = new Map();
  for (const record of active) totals.set(record.date, (totals.get(record.date) || 0) + 1);
  const counts = days.map(day => totals.get(dateKey(day)) || 0);
  const maximum = Math.max(1, ...counts);
  for (const [index, day] of days.entries()) {
    const column = document.createElement('div');
    column.className = 'chart-day';
    column.setAttribute('role', 'listitem');
    const count = document.createElement('b');
    count.textContent = counts[index];
    const track = document.createElement('span');
    track.className = 'track';
    track.setAttribute('aria-hidden', 'true');
    const bar = document.createElement('span');
    bar.className = 'bar';
    bar.style.setProperty('--height', (100 * counts[index] / maximum) + '%');
    track.append(bar);
    const label = document.createElement('span');
    label.textContent = weekday.format(day);
    column.append(count, track, label);
    element('week-chart').append(column);
  }
  const chartState = element('chart-state');
  chartState.textContent = 'No appointments scheduled for this week.';
  chartState.hidden = counts.some(count => count > 0);
}

async function loadDashboard() {
  const routes = ['appointments', 'patients', 'doctors', 'payments'];
  const [appointments, patients, doctors, payments] = await Promise.allSettled(routes.map(loadList));
  if (appointments.status === 'fulfilled') renderAppointments(appointments.value);
  else {
    element('agenda-state').textContent = 'Could not load appointments.';
    element('chart-state').textContent = 'Could not load the appointment chart.';
  }
  if (patients.status === 'fulfilled') element('patient-total').textContent = patients.value.length;
  if (doctors.status === 'fulfilled') element('doctor-total').textContent = doctors.value.length;
  if (payments.status === 'fulfilled') {
    element('payment-total').textContent = payments.value.filter(record => String(record.status).toLowerCase() === 'pending').length;
  }
  if ([appointments, patients, doctors, payments].some(result => result.status === 'rejected')) {
    const status = element('status');
    status.textContent = 'Some dashboard data could not load. Refresh the page to try again.';
    status.hidden = false;
  }
}
loadDashboard();
