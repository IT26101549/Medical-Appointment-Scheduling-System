"use strict";
 const cfg = window.APP_CONFIG;
 const api = '/api/' + cfg.plural;
 const form = document.getElementById('entryForm');
 const fieldsEl = document.getElementById('fields');
 const bodyEl = document.getElementById('tableBody');
 const headEl = document.getElementById('tableHead');
 let editingId = null;
 let items = [];
 const shownColumns = cfg.fields.slice(0, 4);
 function showMessage(message, error = false) {
   window.hospitalNotify(message, error ? 'error' : 'success');
 }
 function buildForm() {
   for (const f of cfg.fields) {
     const wrapper = document.createElement('div');
     wrapper.className = 'formfield';
     const label = document.createElement('label');
     label.htmlFor = f.key;
     label.textContent = f.label + (f.required ? ' *' : '');
     let input;
     if (f.type === 'textarea') input = document.createElement('textarea');
     else if (f.type.startsWith('select:')) {
       input = document.createElement('select');
       const first = document.createElement('option'); first.value = ''; first.textContent = 'Select ' + f.label;
       input.append(first);
       for (const opt of f.type.slice(7).split('|')) {
         const o = document.createElement('option');o.value = opt;o.textContent = opt;input.append(o);
       }
     } else { input = document.createElement('input');input.type = f.type; }
     input.id = f.key; input.name = f.key; input.required = f.required;
     if (f.type === 'tel') { input.placeholder = '0771234567 or +94771234567'; input.pattern = '(07[0-9]{8}|\\+947[0-9]{8})'; input.title = 'Sri Lankan mobile: 0771234567 or +94771234567'; }
     if (f.type === 'date') input.min = new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
     if (f.type === 'number') { input.step = f.key === 'amount' ? '0.01' : '1';input.min='0'; }
     if (f.key === 'age') {
       input.max = '100';
       addAgeOptions(input);
     }
     wrapper.append(label, input); fieldsEl.append(wrapper);
   }
 }
 function addAgeOptions(age) {
   const mode = document.createElement('select');
   mode.id = mode.name = 'ageEntryMode';
   mode.add(new Option('Enter age', 'manual'));
   mode.add(new Option('Calculate from birth date', 'birthDate'));

   const birthDate = document.createElement('input');
   birthDate.id = birthDate.name = 'birthDate';
   birthDate.type = 'text';
   birthDate.placeholder = 'DD/MM/YYYY';
   birthDate.maxLength = 10;
   birthDate.autocomplete = 'bday';
   for (const [input, text] of [[mode, 'Age entry method'], [birthDate, 'Birth date (DD/MM/YYYY) *']]) {
     const field = document.createElement('div');
     field.className = 'formfield';
     const label = document.createElement('label');
     label.htmlFor = input.id;
     label.textContent = text;
     field.append(label, input);
     fieldsEl.append(field);
   }

   mode.addEventListener('change', () => {
     age.value = '';
     syncAgeFields();
   });
   birthDate.addEventListener('input', syncAgeFields);
 }
 function syncAgeFields() {
   const { ageEntryMode, birthDate, age } = form.elements;
   const calculate = ageEntryMode.value === 'birthDate';
   birthDate.parentElement.hidden = !calculate;
   birthDate.disabled = !calculate;
   birthDate.required = calculate;
   age.type = calculate ? 'text' : 'number';
   age.readOnly = calculate;
   age.required = !calculate;
   birthDate.setCustomValidity('');
   if (!calculate) return;

   const today = new Date();
   const year = today.getFullYear();
   const month = today.getMonth() + 1;
   const day = today.getDate();
   const todayIso = [year, month, day].map(part => String(part).padStart(2, '0')).join('-');
   age.value = '';
   if (!birthDate.value.trim()) return;
   const isoDate = parseBirthDate(birthDate.value);
   if (!isoDate) {
     birthDate.setCustomValidity('Enter a valid birth date in DD/MM/YYYY format.');
     return;
   }
   if (isoDate > todayIso) {
     birthDate.setCustomValidity('Birth date cannot be in the future.');
     return;
   }
   const months = completedMonths(isoDate, today);
   age.value = formatAge(months);
   if (months >= 101 * 12) birthDate.setCustomValidity('Patient age must be 100 or below.');
 }
 function parseBirthDate(value) {
   const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
   if (!parts) return '';
   const [, day, month, year] = parts;
   const isoDate = [year, month, day].join('-');
   const date = new Date(isoDate + 'T00:00:00Z');
   if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return '';
   return isoDate;
 }
 function completedMonths(birthDate, today = new Date()) {
   const [year, month, day] = birthDate.split('-').map(Number);
   return (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month)
     - Number(today.getDate() < day);
 }
 function formatAge(months) {
   if (months >= 12) return String(Math.floor(months / 12));
   return months + (months === 1 ? ' month' : ' months');
 }
 function displayedPatientAge(patient) {
   const months = patient.birthDate ? completedMonths(patient.birthDate) : NaN;
   return months >= 0 ? formatAge(months) : patient.age;
 }
 function clearForm() {
   form.reset(); editingId = null;
   syncAgeFields();
   document.getElementById('formHeading').textContent = 'Add New Record';
   document.getElementById('saveBtn').textContent = '+ Save Record';
 }
 async function request(path, options) {
   let response;
   try { response = await window.hospitalRequest(path, options); }
   catch (_) { throw new Error('Cannot reach the server. Check that Spring Boot is running.'); }
   if (!response.ok) {
     let message = `Request failed (${response.status})`;
     try { const data = await response.json();message = data.error || message; } catch (_) { /* empty response */ }
     throw new Error(message);
   }
   return response.status === 204 ? null : response.json();
 }
 async function refresh() {
   try { items = await request(api);render(); }
   catch (err) { showMessage(err.message, true); }
 }
 function render() {
   document.getElementById('count').textContent = items.length;
   const q = document.getElementById('search').value.trim().toLowerCase();
   const filtered = items.filter(it => Object.values(it).some(v => String(v ?? '').toLowerCase().includes(q)));
   bodyEl.replaceChildren();
   headEl.replaceChildren();
   const hr = document.createElement('tr');
   for (const label of ['No.', ...shownColumns.map(x => x.label), 'Actions']) { const th = document.createElement('th');th.textContent=label;hr.append(th); }
   headEl.append(hr);
   document.getElementById('empty').hidden = filtered.length !== 0;
   for (const [index, it] of filtered.entries()) {
     const number = index + 1;
     const tr = document.createElement('tr');
     const numberCell = document.createElement('td');
     const badge = document.createElement('span');
     badge.className = 'idbadge';
     badge.textContent = String(number);
     badge.title = 'Patient ID #' + it.id;
     numberCell.append(badge);
     tr.append(numberCell);
     for (const f of shownColumns) {
       const value = f.key === 'age' ? displayedPatientAge(it) : it[f.key];
       const td = document.createElement('td');
       td.textContent = value || '—';
       td.title = String(value || '');
       tr.append(td);
     }
     const td = document.createElement('td');
     const edit = document.createElement('button');edit.type='button';edit.className='btn-sm';edit.textContent='Edit';edit.addEventListener('click',()=>startEdit(it));
     const del = document.createElement('button');del.type='button';del.className='btn-sm delete';del.textContent='Delete';del.addEventListener('click',()=>remove(it, number));
     const view = document.createElement('button');
     view.type = 'button';
     view.className = 'btn-sm';
     view.textContent = 'View Patient';
     view.addEventListener('click', () => showPatient(it));
     td.append(view, edit, del);tr.append(td);bodyEl.append(tr);
   }
 }
 let historyRequest = 0;

 function renderHistory(target, records, headings, getValues, emptyMessage) {
   target.replaceChildren();
   if (!records.length) {
     target.textContent = emptyMessage;
     return;
   }
   const table = document.createElement('table');
   const header = table.createTHead().insertRow();
   for (const title of headings) {
     const th = document.createElement('th');
     th.scope = 'col';
     th.textContent = title;
     header.append(th);
   }
   const body = table.createTBody();
   for (const record of records) {
     const row = body.insertRow();
     for (const value of getValues(record)) row.insertCell().textContent = value || '—';
   }
   target.append(table);
 }

 async function loadPatientHistory(patientId) {
   const currentRequest = ++historyRequest;
   const upcoming = document.getElementById('profile-upcoming');
   const visits = document.getElementById('profile-visits');
   upcoming.textContent = visits.textContent = 'Loading…';
   const [appointments, medicalRecords] = await Promise.allSettled([
     request('/api/appointments'), request('/api/records'),
   ]);
   if (currentRequest !== historyRequest || !document.getElementById('patient-profile').open) return;

   const matchesPatient = record => /^\d+$/.test(String(record.patientId))
     && String(record.patientId).replace(/^0+(?=\d)/, '') === String(patientId);
   const now = new Date();
   const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
     .map(value => String(value).padStart(2, '0')).join('-');
   if (appointments.status === 'fulfilled' && Array.isArray(appointments.value)) {
     const timeKey = item => item.date + 'T' + item.time;
     const records = appointments.value.filter(item => matchesPatient(item)
       && String(item.status).toLowerCase() !== 'cancelled' && new Date(timeKey(item)) >= now)
       .sort((a, b) => timeKey(a).localeCompare(timeKey(b)));
     renderHistory(upcoming, records, ['Date & Time', 'Doctor', 'Type', 'Status'],
       item => [item.date + ' · ' + item.time, item.doctorName, item.appointmentType, item.status],
       'No upcoming appointments linked to this patient.');
   } else {
     upcoming.textContent = 'Could not load appointments. Reopen the profile to retry.';
   }
   if (medicalRecords.status === 'fulfilled' && Array.isArray(medicalRecords.value)) {
     const records = medicalRecords.value.filter(item => matchesPatient(item)
       && item.visitDate && item.visitDate <= today)
       .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
     renderHistory(visits, records, ['Visit Date', 'Doctor', 'Diagnosis', 'Treatment'],
       item => [item.visitDate, item.doctorName, item.diagnosis, item.treatment],
       'No past visits linked to this patient.');
   } else {
     visits.textContent = 'Could not load past visits. Reopen the profile to retry.';
   }
 }

 function showPatient(patient) {
   const profile = document.getElementById('patient-profile');
   document.getElementById('profile-title').textContent = patient.name;
   document.getElementById('profile-id').textContent = 'Patient ID #' + patient.id;
   document.getElementById('profile-initials').textContent = patient.name.trim().split(/\s+/u)
     .slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase();
   const details = document.getElementById('profile-details');
   details.replaceChildren();
   for (const [label, value] of [
     ['Age', displayedPatientAge(patient)], ['Birth date', patient.birthDate], ['Gender', patient.gender],
     ['Phone', patient.phone], ['Email', patient.email], ['Address', patient.address],
   ]) {
     const pair = document.createElement('div');
     const term = document.createElement('dt');
     term.textContent = label;
     const description = document.createElement('dd');
     description.textContent = value ?? '—';
     if (description.textContent === '') description.textContent = '—';
     pair.append(term, description);
     details.append(pair);
   }
   document.getElementById('profile-book').href = '/appointment/index.html?' +
     new URLSearchParams({patientId: patient.id});
   document.getElementById('profile-edit').onclick = () => {
     profile.close();
     startEdit(patient);
     document.getElementById('name').focus();
   };
   profile.showModal();
   loadPatientHistory(patient.id);
 }
 function startEdit(it) {
   editingId = it.id;
   window.hospitalNotify('Editing patient #' + it.id + '.', 'info');
   for (const f of cfg.fields) document.getElementById(f.key).value = it[f.key] ?? '';
   form.elements.ageEntryMode.value = it.birthDate ? 'birthDate' : 'manual';
   form.elements.birthDate.value = it.birthDate ? it.birthDate.split('-').reverse().join('/') : '';
   syncAgeFields();
   document.getElementById('formHeading').textContent = 'Edit Record #' + it.id;
   document.getElementById('saveBtn').textContent = 'Update Record';
   window.scrollTo({top:0,behavior:'smooth'});
 }
 async function remove(it, number) {
   const removed = await window.confirmHospitalDelete({
     record: 'patient',
     name: it.name || 'Patient',
     details: ['No. ' + number, it.email].filter(Boolean).join(' · '),
   }, () => request(api + '/' + it.id, {method: 'DELETE'}));
   if (!removed) return;
   if (editingId === it.id) clearForm();
   showMessage('Patient deleted successfully.');
   await refresh();
 }
 form.addEventListener('submit',async e => {
   e.preventDefault();
   const payload = {};
   for (const f of cfg.fields) payload[f.key] = document.getElementById(f.key).value.trim();
   payload.birthDate = form.elements.birthDate.disabled ? '' : parseBirthDate(form.elements.birthDate.value);
   if (payload.birthDate) delete payload.age;
   const edit = editingId !== null;
   if (payload.email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(payload.email)) {
     showMessage('Enter a valid email address.', true);return;
   }
   if (payload.phone && !/^(07\d{8}|\+947\d{8})$/.test(payload.phone)) {
     showMessage('Phone must be 0771234567 or +94771234567.', true);return;
   }
   if (payload.date && payload.startTime && payload.endTime) {
     const start = new Date(payload.date + 'T' + payload.startTime + ':00');
     const end = new Date(payload.date + 'T' + payload.endTime + ':00');
     if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start <= new Date() || end <= start) {
       showMessage('Enter a future schedule with end time after start time.', true);return;
     }
   }
   try {
     await request(edit ? api+'/'+editingId : api,{method:edit?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
     showMessage(edit ? 'Patient changes saved.' : 'Patient added successfully.');
     clearForm();await refresh();
   } catch(err) { showMessage(err.message,true); }
 });
 document.getElementById('resetBtn').addEventListener('click',clearForm);
 document.getElementById('refresh').addEventListener('click',refresh);
 document.getElementById('search').addEventListener('input',render);
 buildForm();syncAgeFields();refresh();

