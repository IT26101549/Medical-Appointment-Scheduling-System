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
     wrapper.append(label, input); fieldsEl.append(wrapper);
   }
 }
 function clearForm() {
   form.reset(); editingId = null;
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
   for (const label of ['ID', ...shownColumns.map(x => x.label), 'Actions']) { const th = document.createElement('th');th.textContent=label;hr.append(th); }
   headEl.append(hr);
   document.getElementById('empty').hidden = filtered.length !== 0;
   for (const it of filtered) {
     const tr = document.createElement('tr');
     const idtd = document.createElement('td');const badge = document.createElement('span');badge.className='idbadge';badge.textContent='#'+it.id;idtd.append(badge);tr.append(idtd);
     for (const f of shownColumns) { const td = document.createElement('td');td.textContent = it[f.key] || '—';td.title = String(it[f.key] || '');tr.append(td); }
     const td = document.createElement('td');
     const edit = document.createElement('button');edit.type='button';edit.className='btn-sm';edit.textContent='Edit';edit.addEventListener('click',()=>startEdit(it));
     const del = document.createElement('button');del.type='button';del.className='btn-sm delete';del.textContent='Delete';del.addEventListener('click',()=>remove(it));
     td.append(edit,del);tr.append(td);bodyEl.append(tr);
   }
 }
 function startEdit(it) {
   editingId = it.id;
   window.hospitalNotify('Editing patient #' + it.id + '.', 'info');
   for (const f of cfg.fields) document.getElementById(f.key).value = it[f.key] || '';
   document.getElementById('formHeading').textContent = 'Edit Record #' + it.id;
   document.getElementById('saveBtn').textContent = 'Update Record';
   window.scrollTo({top:0,behavior:'smooth'});
 }
 async function remove(it) {
   if (!confirm('Delete ' + cfg.entity + ' #' + it.id + '? This cannot be undone.')) return;
   try { await request(api+'/'+it.id, {method:'DELETE'});if (editingId===it.id) clearForm();showMessage('Patient deleted successfully.');await refresh(); }
   catch(err) { showMessage(err.message,true); }
 }
 form.addEventListener('submit',async e => {
   e.preventDefault();
   const payload = {};
   for (const f of cfg.fields) payload[f.key] = document.getElementById(f.key).value.trim();
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
 buildForm();refresh();
