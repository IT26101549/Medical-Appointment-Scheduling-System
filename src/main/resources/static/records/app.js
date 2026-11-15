"use strict";
 const cfg = window.APP_CONFIG;
 const api = '/api/' + cfg.plural;
 const form = document.getElementById('entryForm');
 const fieldsEl = document.getElementById('fields');
 const bodyEl = document.getElementById('tableBody');
 const headEl = document.getElementById('tableHead');
 const patientChoice = document.getElementById('record-patient');
 const recordDialog = document.getElementById('record-details');
 let editingId = null;
 let items = [];
 let patients = [];
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
     if (f.key === 'patientId' || f.key === 'patientName') {
       input.type = 'text';
       input.readOnly = true;
     }
     if (f.type === 'number') { input.step = f.key === 'amount' ? '0.01' : '1';input.min='0'; }
     wrapper.append(label, input); fieldsEl.append(wrapper);
   }
 }
 function updatePatientOptions() {
   const idField = document.getElementById('patientId');
   const nameField = document.getElementById('patientName');
   const selectedId = idField.value;
   const prompt = patients.length ? 'Select a patient' : 'No registered patients';
   patientChoice.replaceChildren(new Option(prompt, ''));
   for (const patient of patients) {
     const option = new Option(patient.name + ' · #' + patient.id, patient.id);
     option.dataset.name = patient.name;
     patientChoice.add(option);
   }
   if (selectedId && !patients.some(patient => String(patient.id) === selectedId)) {
     if (editingId !== null) {
       const option = new Option(nameField.value + ' · #' + selectedId + ' (saved record)', selectedId);
       option.dataset.name = nameField.value;
       patientChoice.add(option);
     } else {
       idField.value = nameField.value = '';
     }
   }
   patientChoice.value = idField.value;
 }
 async function loadPatients() {
   const status = document.getElementById('record-patient-status');
   try {
     patients = await request('/api/patients');
     updatePatientOptions();
     status.textContent = patients.length ? '' : 'Register a patient in Patients before adding a medical record.';
   } catch {
     status.textContent = 'Could not load patients. Use Refresh to try again.';
   }
 }
 patientChoice.addEventListener('change', () => {
   document.getElementById('patientId').value = patientChoice.value;
   document.getElementById('patientName').value = patientChoice.selectedOptions[0]?.dataset.name || '';
 });
 function clearForm() {
   form.reset(); editingId = null;
   updatePatientOptions();
   document.getElementById('formHeading').textContent = 'Add Medical Record';
   document.getElementById('saveBtn').textContent = 'Save Medical Record';
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
   for (const label of ['ID', ...shownColumns.map(x => x.label), 'Actions']) { const th = document.createElement('th');th.textContent=label;hr.append(th); }
   headEl.append(hr);
   document.getElementById('empty').hidden = filtered.length !== 0;
   for (const it of filtered) {
     const tr = document.createElement('tr');
     const idtd = document.createElement('td');const badge = document.createElement('span');badge.className='idbadge';badge.textContent='#'+it.id;idtd.append(badge);tr.append(idtd);
     for (const f of shownColumns) { const td = document.createElement('td');td.textContent = it[f.key] || '—';td.title = String(it[f.key] || '');tr.append(td); }
     const td = document.createElement('td');
     const view = document.createElement('button');
     view.type = 'button';
     view.className = 'btn-sm';
     view.textContent = 'View';
     view.addEventListener('click', () => viewRecord(it));
     const edit = document.createElement('button');edit.type='button';edit.className='btn-sm';edit.textContent='Edit';edit.addEventListener('click',()=>startEdit(it));
     const del = document.createElement('button');del.type='button';del.className='btn-sm delete';del.textContent='Delete';del.addEventListener('click',()=>remove(it));
     td.append(view,edit,del);tr.append(td);bodyEl.append(tr);
   }
 }
 function viewRecord(record) {
   document.getElementById('record-details-title').textContent = 'Medical Record #' + record.id;
   for (const field of cfg.fields) {
     document.getElementById('record-view-' + field.key).textContent = record[field.key] || '—';
   }
   recordDialog.showModal();
 }
 function startEdit(it) {
   editingId = it.id;
   window.hospitalNotify('Editing medical record #' + it.id + '.', 'info');
   for (const f of cfg.fields) document.getElementById(f.key).value = it[f.key] || '';
   updatePatientOptions();
   document.getElementById('formHeading').textContent = 'Edit Record #' + it.id;
   document.getElementById('saveBtn').textContent = 'Update Record';
   window.scrollTo({top:0,behavior:'smooth'});
 }
 async function remove(it) {
   const removed = await window.confirmHospitalDelete({
     record: 'medical record',
     name: it.patientName || 'Medical record',
     details: ['Record #' + it.id, [it.visitDate, it.doctorName].filter(Boolean).join(" · ")].filter(Boolean).join(' · '),
   }, () => request(api + '/' + it.id, {method: 'DELETE'}));
   if (!removed) return;
   if (editingId === it.id) clearForm();
   showMessage('Medical record deleted successfully.');
   await refresh();
 }
 form.addEventListener('submit',async e => {
   e.preventDefault();
   const payload = {};
   for (const f of cfg.fields) payload[f.key] = document.getElementById(f.key).value.trim();
   if (!patientChoice.value || payload.patientId !== patientChoice.value || !payload.patientName) {
     showMessage('Select a patient before saving.', true);
     return;
   }
   const edit = editingId !== null;
   try {
     await request(edit ? api+'/'+editingId : api,{method:edit?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
     showMessage(edit ? 'Medical record changes saved.' : 'Medical record added successfully.');
     clearForm();await refresh();
   } catch(err) { showMessage(err.message,true); }
 });
 document.getElementById('resetBtn').addEventListener('click',clearForm);
 document.getElementById('refresh').addEventListener('click', () => { refresh(); loadPatients(); });
 document.getElementById('search').addEventListener('input',render);
 buildForm();refresh();loadPatients();
