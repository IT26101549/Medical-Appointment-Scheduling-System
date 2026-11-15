"use strict";
 const cfg = window.APP_CONFIG;
 const api = '/api/' + cfg.plural;
 const form = document.getElementById('entryForm');
 const fieldsEl = document.getElementById('fields');
 const bodyEl = document.getElementById('tableBody');
 const headEl = document.getElementById('tableHead');
 let editingId = null;
 let items = [];
 let paymentsRevision = 0;
 const appointments = new Map();
 const byId = id => document.getElementById(id);
 const currency = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', currencyDisplay: 'code' });
 let appointmentsLoaded = false;
 let saving = false;
 let page = 1;
 const pageSize = 5;
 const statusColors = {paid:'#0b9c57', pending:'#efa12c', failed:'#d92f49', refunded:'#795acf', other:'#879bb3'};
 const statusLabels = {paid:'Paid', pending:'Pending', failed:'Failed', refunded:'Refunded', other:'Other'};

 function renderSummary() {
   const counts = {paid:0, pending:0, failed:0, refunded:0, other:0};
   let paidAmount = 0;
   let pendingAmount = 0;
   for (const item of items) {
     const status = statusKey(item.status);
     counts[Object.hasOwn(counts,status) ? status : 'other']++;
     if (status === 'paid') paidAmount += amountInCents(item.amount);
     if (status === 'pending') pendingAmount += amountInCents(item.amount);
   }
   byId('metric-1').textContent = counts.paid;
   byId('metric-2').textContent = counts.pending;
   byId('metric-3').textContent = counts.failed;
   byId('amount-1').textContent = currency.format(paidAmount / 100) + ' collected';
   byId('amount-2').textContent = currency.format(pendingAmount / 100) + ' pending';
   byId('paid-share').textContent = items.length ? Math.round(100 * counts.paid / items.length) + '%' : '0%';
   const legend = byId('payment-legend');
   legend.replaceChildren();
   const wedges = [];
   let total = 0;
   for (const [key, count] of Object.entries(counts)) {
     if (count) {
       wedges.push(statusColors[key] + ' ' + (total / items.length * 100) + '% ' + ((total + count) / items.length * 100) + '%');
       total += count;
     }
     if (!count && (key === 'other' || key === 'refunded')) continue;
     const li = document.createElement('li');
     li.style.setProperty('--dot', statusColors[key]);
     li.textContent = statusLabels[key] + ' ' + count;
     legend.append(li);
   }
   byId('payment-chart').style.background = wedges.length ? 'conic-gradient(' + wedges.join(', ') + ')' : '#dce8f6';
 }

 function renderPagination(count) {
   const pages = Math.max(1, Math.ceil(count / pageSize));
   page = Math.min(page, pages);
   const start = (page - 1) * pageSize;
   byId('payment-page-summary').textContent = count
     ? 'Showing ' + (start + 1) + '–' + Math.min(start + pageSize, count) + ' of ' + count + ' payments'
     : '0 payments';
   const buttons = byId('payment-page-buttons');
   buttons.replaceChildren();
   function add(label, target, accessibleLabel, disabled) {
     const button = document.createElement('button');
     button.type = 'button';
     button.className = 'secondary';
     button.textContent = label;
     button.setAttribute('aria-label', accessibleLabel);
     button.disabled = disabled;
     if (label === String(page)) button.setAttribute('aria-current', 'page');
     button.addEventListener('click', () => {
       page = target;
       render();
       const nextFocus = Array.from(buttons.children).find(element => element.getAttribute('aria-current') === 'page');
       nextFocus?.focus();
     });
     buttons.append(button);
   }
   if (pages > 1) {
     add('‹', page - 1, 'Previous page', page === 1);
     const first = Math.max(1, Math.min(page - 2, pages - 4));
     for (let number = first; number <= Math.min(pages, first + 4); number++) {
       add(String(number), number, 'Page ' + number, false);
     }
     add('›', page + 1, 'Next page', page === pages);
   }
   return start;
 }

 function statusKey(value) {
   return String(value ?? '').trim().toLowerCase();
 }

 function amountInCents(value) {
   const amount = Number(value);
   return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
 }

 function appointmentLabel(appointment) {
   return ['#' + appointment.id, appointment.patientName, appointment.doctorName, appointment.date].filter(Boolean).join(' · ');
 }

 function updateSaveButton() {
   const button = byId('saveBtn');
   button.disabled = saving || (editingId === null && (!appointmentsLoaded || !appointments.size));
   if (isDemoCardPayment()) {
     const amount = Number(byId('amount').value);
     button.textContent = saving ? 'Processing payment…' : amount > 0
       ? 'Pay ' + currency.format(amount) : 'Pay by Card';
   } else {
     button.textContent = editingId === null ? 'Save Payment' : 'Update Record';
   }
 }

 function showAppointmentOptions(selectedId = '', legacyPatient = '') {
   const selection = byId('appointmentId');
   selection.replaceChildren(new Option('Select an appointment', ''));
   for (const [id, appointment] of appointments) selection.add(new Option(appointmentLabel(appointment), id));
   if (selectedId && !appointments.has(selectedId)) {
     selection.add(new Option('#' + selectedId + ' · Saved payment appointment', selectedId));
   }
   selection.value = selectedId;
   byId('patientName').value = appointments.get(selectedId)?.patientName ?? legacyPatient;
   updateSaveButton();
 }

 async function loadAppointments() {
   try {
     const records = await request('/api/appointments');
     appointments.clear();
     for (const record of records) appointments.set(String(record.id), record);
     appointmentsLoaded = true;
     byId('payment-appointment-status').textContent = appointments.size ? '' : 'Book an appointment before recording a payment.';
   } catch {
     appointmentsLoaded = false;
     byId('payment-appointment-status').textContent = 'Could not load appointments. Use Refresh to try again.';
   }
   showAppointmentOptions(byId('appointmentId').value, byId('patientName').value);
 }
 function showMessage(message, error = false) {
   window.hospitalNotify(message, error ? 'error' : 'success');
 }
 function isDemoCardPayment() {
   return editingId === null && byId('method').value === 'Card';
 }
 function updatePaymentMode() {
   const card = isDemoCardPayment();
   const cardFields = byId('demo-card-fields');
   cardFields.hidden = cardFields.disabled = !card;
   if (!card) {
     for (const input of cardFields.querySelectorAll('[contenteditable]')) input.textContent = '';
   }
   for (const key of ['paymentDate', 'status']) {
     const input = byId(key);
     input.disabled = input.parentElement.hidden = card;
   }
   updateSaveButton();
 }
 function cardPaymentError(today) {
   if (!/^\d{16}$/.test(byId('card-number').textContent.replace(/\s/g, ''))) {
     return 'Enter a 16-digit test card number.';
   }
   const expiry = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(byId('card-expiry').textContent.trim());
   if (!expiry) return 'Enter the expiry date in MM/YY format.';
   const expiryMonth = (2000 + Number(expiry[2])) * 12 + Number(expiry[1]);
   if (expiryMonth < today.getFullYear() * 12 + today.getMonth() + 1) return 'The card has expired.';
   if (!/^\d{3}$/.test(byId('card-cvv').textContent)) return 'Enter a 3-digit test CVV.';
   if (!byId('cardholder').textContent.trim()) return 'Enter a test cardholder name.';
   return '';
 }
 function buildForm() {
   for (const f of cfg.fields) {
     const wrapper = document.createElement('div');
     wrapper.className = 'formfield';
     const label = document.createElement('label');
     label.htmlFor = f.key;
     label.textContent = (f.key === 'appointmentId' ? 'Appointment' : f.key === 'amount' ? 'Amount (LKR)' : f.label) + (f.required ? ' *' : '');
     let input;
     if (f.key === 'appointmentId') input = document.createElement('select');
     else if (f.type === 'textarea') input = document.createElement('textarea');
     else if (f.type.startsWith('select:')) {
       input = document.createElement('select');
       const first = document.createElement('option'); first.value = ''; first.textContent = 'Select ' + f.label;
       input.append(first);
       for (const opt of f.type.slice(7).split('|')) {
         const o = document.createElement('option');o.value = opt;o.textContent = opt;input.append(o);
       }
     } else { input = document.createElement('input');input.type = f.type; }
     input.id = f.key; input.name = f.key; input.required = f.required;
     if (f.key === 'patientName') input.readOnly = true;
     if (f.key === 'method' || f.key === 'status') {
       const filter = byId(f.key === 'method' ? 'payment-method-filter' : 'payment-status-filter');
       for (const option of Array.from(input.options).slice(1)) filter.add(new Option(option.text, option.value));
     }
     if (f.type === 'number') { input.step = f.key === 'amount' ? '0.01' : '1';input.min='0'; }
     wrapper.dataset.paymentField = f.key;
     wrapper.append(label, input); fieldsEl.append(wrapper);
   }
   const cardFields = document.createElement('fieldset');
   cardFields.id = 'demo-card-fields';
   // Editable text boxes keep test details outside native payment autofill and form serialization.
   cardFields.innerHTML = `
     <legend>Card details</legend>
     <p>Test checkout · Use dummy card details. No charge.</p>
     <div class="formfield"><span id="card-number-label">Card number *</span>
       <div class="card-entry" id="card-number" role="textbox" aria-labelledby="card-number-label" aria-required="true" contenteditable="plaintext-only" inputmode="numeric" data-placeholder="16 digits"></div></div>
     <div class="payment-card-row">
       <div class="formfield"><span id="card-expiry-label">Expiry date *</span>
         <div class="card-entry" id="card-expiry" role="textbox" aria-labelledby="card-expiry-label" aria-required="true" contenteditable="plaintext-only" inputmode="numeric" data-placeholder="MM/YY"></div></div>
       <div class="formfield"><span id="card-cvv-label">CVV *</span>
         <div class="card-entry" id="card-cvv" role="textbox" aria-labelledby="card-cvv-label" aria-required="true" contenteditable="plaintext-only" inputmode="numeric" data-placeholder="3 digits"></div></div>
     </div>
     <div class="formfield"><span id="cardholder-label">Name on card *</span>
       <div class="card-entry" id="cardholder" role="textbox" aria-labelledby="cardholder-label" aria-required="true" contenteditable="plaintext-only" data-placeholder="Cardholder name"></div></div>`;
   fieldsEl.append(cardFields);
   cardFields.addEventListener('keydown', event => {
     if (event.key !== 'Enter' || event.isComposing) return;
     event.preventDefault();
     if (!byId('saveBtn').disabled) form.requestSubmit();
   });
   cardFields.addEventListener('input', event => {
     const input = event.target;
     const text = input.textContent;
     let value = text.replace(/[\r\n]+/g, ' ').slice(0, 80);
     if (input.id !== 'cardholder') {
       const digits = text.replace(/\D/g, '');
       if (input.id === 'card-number') value = (digits.slice(0, 16).match(/.{1,4}/g) || []).join(' ');
       if (input.id === 'card-expiry') value = digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2, 4) : digits;
       if (input.id === 'card-cvv') value = digits.slice(0, 3);
     }
     if (value === text) return;
     input.textContent = value;
     window.getSelection()?.collapse(input, input.childNodes.length);
   });
   byId('method').addEventListener('change', updatePaymentMode);
   byId('amount').addEventListener('input', updateSaveButton);
   updatePaymentMode();
 }
 function clearForm() {
   for (const option of form.querySelectorAll('[data-legacy]')) option.remove();
   form.reset(); editingId = null;
   showAppointmentOptions();
   byId('formHeading').textContent = 'Add Payment';
   updatePaymentMode();
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
 async function refresh(showErrors = true) {
   const revision = ++paymentsRevision;
   try {
     const records = await request(api);
     if (revision !== paymentsRevision) return;
     items = records;
     render();
   }
   catch (err) {
     if (showErrors && revision === paymentsRevision) showMessage(err.message, true);
   }
 }
 function render() {
   document.getElementById('count').textContent = items.length;
   const q = document.getElementById('search').value.trim().toLowerCase();
   renderSummary();
   const date = byId('payment-date-filter').value;
   const endDate = byId('payment-date-end').value;
   const method = byId('payment-method-filter').value;
   const status = byId('payment-status-filter').value;
   const filtered = items.filter(it => (!date || it.paymentDate >= date) && (!endDate || it.paymentDate <= endDate)
     && (!method || statusKey(it.method) === statusKey(method))
     && (!status || statusKey(it.status) === statusKey(status))
     && Object.values(it).some(value => statusKey(value).includes(q)));
   bodyEl.replaceChildren();
   headEl.replaceChildren();
   const hr = document.createElement('tr');
   for (const label of ['#', 'Appointment', 'Patient', 'Amount', 'Method', 'Date', 'Status', 'Actions']) { const th = document.createElement('th');th.textContent=label;hr.append(th); }
   headEl.append(hr);
   document.getElementById('empty').hidden = filtered.length !== 0;
   const start = renderPagination(filtered.length);
   for (const [index, it] of filtered.slice(start, start + pageSize).entries()) {
     const tr = document.createElement('tr');
     const idtd = document.createElement('td');const badge = document.createElement('span');badge.className='idbadge';badge.textContent=String(start + index + 1);badge.title='Payment ID #' + it.id;idtd.append(badge);tr.append(idtd);
     for (const value of ['#' + it.appointmentId, it.patientName, currency.format(Number(it.amount)), it.method, it.paymentDate]) {
       const cell = document.createElement('td');
       cell.textContent = value || '—';
       tr.append(cell);
     }
     const statusCell = document.createElement('td');
     const badgeStatus = document.createElement('span');
     badgeStatus.className = 'payment-status';
     badgeStatus.dataset.status = statusKey(it.status);
     badgeStatus.textContent = it.status;
     statusCell.append(badgeStatus);
     tr.append(statusCell);
     const td = document.createElement('td');
     td.className = 'payment-actions';
     const view = document.createElement('button');
     view.type = 'button';
     view.className = 'btn-sm';
     view.textContent = 'View';
     view.addEventListener('click', () => viewPayment(it));
     const edit = document.createElement('button');edit.type='button';edit.className='btn-sm';edit.textContent='Edit';edit.addEventListener('click',()=>startEdit(it));
     const del = document.createElement('button');del.type='button';del.className='btn-sm delete';del.textContent='Delete';del.addEventListener('click',()=>remove(it));
     td.append(view,edit,del);tr.append(td);bodyEl.append(tr);
   }
 }
 function startEdit(it) {
   editingId = it.id;
   window.hospitalNotify('Editing payment #' + it.id + '.', 'info');
   showAppointmentOptions(String(it.appointmentId), it.patientName);
   for (const field of cfg.fields) {
     if (field.key === 'appointmentId' || field.key === 'patientName') continue;
     const input = byId(field.key);
     const value = String(it[field.key] ?? '');
     if (input.tagName === 'SELECT') {
       input.querySelector('[data-legacy]')?.remove();
       if (value && !Array.from(input.options).some(option => option.value === value)) {
         const option = new Option(value, value);
         option.dataset.legacy = 'true';
         input.add(option);
       }
     }
     input.value = value;
   }
   document.getElementById('formHeading').textContent = 'Edit Payment #' + it.id;
   byId('formHeading').scrollIntoView({block:'nearest'});
   updatePaymentMode();
   byId('amount').focus({preventScroll:true});
 }
 function viewPayment(payment) {
   const paid = statusKey(payment.status) === 'paid';
   byId('payment-detail-title').textContent = (paid ? 'Payment Receipt' : 'Payment Details') + ' #' + payment.id;
   const fields = byId('payment-detail-fields');
   fields.replaceChildren();
   const appointment = appointments.get(String(payment.appointmentId));
   const values = [
     ['Patient', payment.patientName],
     ['Appointment', appointment ? appointmentLabel(appointment) : '#' + payment.appointmentId],
     ['Amount', currency.format(Number(payment.amount))],
     ['Payment method', payment.method], ['Payment date', payment.paymentDate], ['Status', payment.status],
   ];
   for (const [label, value] of values) {
     const pair = document.createElement('div');
     const name = document.createElement('dt');
     const data = document.createElement('dd');
     name.textContent = label;
     data.textContent = value || '—';
     pair.append(name, data);
     fields.append(pair);
   }
   byId('print-payment').hidden = !paid;
   byId('payment-detail').showModal();
 }

 async function remove(it) {
   const removed = await window.confirmHospitalDelete({
     record: 'payment',
     name: it.patientName || 'Payment',
     details: ['Record #' + it.id, [it.amount, it.status].filter(Boolean).join(" · ")].filter(Boolean).join(' · '),
   }, () => request(api + '/' + it.id, {method: 'DELETE'}));
   if (!removed) return;
   if (editingId === it.id) clearForm();
   showMessage('Payment deleted successfully.');
   await refresh();
 }
 form.addEventListener('submit',async e => {
   e.preventDefault();
   if (saving) return;
   const payload = {};
   for (const f of cfg.fields) payload[f.key] = document.getElementById(f.key).value.trim();
   const edit = editingId !== null;
   if (!edit && !appointments.has(payload.appointmentId)) {
     showMessage('Select a saved appointment before recording a payment.', true);
     return;
   }
   const card = isDemoCardPayment();
   if (card) {
     const today = new Date();
     const error = cardPaymentError(today);
     if (error || !(Number(payload.amount) > 0)) {
       showMessage(error || 'Enter a card payment amount greater than zero.', true);
       return;
     }
     payload.paymentDate = [today.getFullYear(), today.getMonth() + 1, today.getDate()]
       .map(value => String(value).padStart(2, '0')).join('-');
     payload.status = 'Paid';
   }
   saving = true;
   updateSaveButton();
   try {
     const saved = await request(edit ? api+'/'+editingId : api,{method:edit?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
     if (card) {
       items = [saved, ...items.filter(item => item.id !== saved.id)];
       page = 1;
       render();
       showMessage('Payment successful · ' + currency.format(Number(saved.amount)));
       clearForm();
       await refresh(false);
     } else {
       showMessage(edit ? 'Payment changes saved.' : 'Payment added successfully.');
       clearForm();
       await refresh();
     }
   } catch(err) { showMessage(err.message,true); }
   finally { saving = false; updateSaveButton(); }
 });
 document.getElementById('resetBtn').addEventListener('click',clearForm);
 byId('refresh').addEventListener('click', () => { refresh(); loadAppointments(); });
 document.getElementById('search').addEventListener('input', () => { page = 1; render(); });
 for (const id of ['payment-date-filter', 'payment-date-end', 'payment-method-filter', 'payment-status-filter']) {
   byId(id).addEventListener('change', () => { page = 1; render(); });
 }
 byId('print-payment').addEventListener('click', () => window.print());
 buildForm();
 byId('appointmentId').addEventListener('change', () => {
   const id = byId('appointmentId').value;
   const previous = items.find(item => item.id === editingId && String(item.appointmentId) === id);
   byId('patientName').value = appointments.get(id)?.patientName ?? previous?.patientName ?? '';
 });
 showAppointmentOptions();
 refresh();
 loadAppointments();
