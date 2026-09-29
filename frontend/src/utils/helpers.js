/**
 * Utility helpers: formatters, validators, etc.
 * VetAssist Cattle Clinic
 */

/* ── Date/Time ── */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatTime(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function isToday(dateStr) {
  return dateStr && dateStr.split('T')[0] === todayISO();
}

export function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/* ── Currency ── */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount ?? 0);
}

/* ── Initials ── */
export function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

/* ── Age ── */
export function calcAge(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years--;
  return years;
}

/* ── Validators ── */
export function required(val) {
  if (val === undefined || val === null) return 'This field is required';
  if (typeof val === 'string' && val.trim() === '') return 'This field is required';
  return null;
}

/* ── Search ── */
export function fuzzyMatch(item, query, keys) {
  if (!query) return true;
  const q = query.toLowerCase();
  return keys.some(key => {
    const val = String(item[key] ?? '').toLowerCase();
    return val.includes(q);
  });
}

/* ── Chart colors — earthy greens/browns for cattle theme ── */
export const CHART_COLORS = ['#2d6a4f','#52b788','#74c69d','#40916c','#b5832a','#6b8c6e','#1b4332','#95d5b2'];

/* ── Status badge variants ── */
export function appointmentStatusVariant(status) {
  const map = {
    Scheduled:    'info',
    Completed:    'success',
    Cancelled:    'error',
    'No Show':    'warning',
    'In Progress':'primary',
  };
  return map[status] || 'default';
}

export function paymentStatusVariant(status) {
  const map = { Paid: 'success', Pending: 'warning', Overdue: 'error', Refunded: 'info', Cancelled: 'default' };
  return map[status] || 'default';
}

export function inventoryStatusVariant(qty, threshold) {
  if (qty === 0) return 'error';
  if (qty <= threshold) return 'warning';
  return 'success';
}
