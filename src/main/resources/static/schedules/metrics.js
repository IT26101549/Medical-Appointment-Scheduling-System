
const metrics = [["availability", "Available"], ["availability", "Booked"], ["availability", "Unavailable"]];
const count = document.getElementById('count');
async function updateMetrics() {
  try {
    const response = await fetch('/api/schedules');
    if (!response.ok) return;
    const records = await response.json();
    metrics.forEach(([field, rule], index) => {
      const values = records.map(record => String(record[field] ?? '').trim()).filter(Boolean);
      const total = rule === 'distinct' ? new Set(values).size
        : rule === null ? values.length
        : values.filter(value => value.toLowerCase() === rule.toLowerCase()).length;
      document.getElementById('metric-' + (index + 1)).textContent = total;
    });
  } catch {
    // The CRUD panel reports connection errors.
  }
}
new MutationObserver(updateMetrics).observe(count, { childList: true });
