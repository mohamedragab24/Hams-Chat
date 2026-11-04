'use strict';
// Wanas admin dashboard (starter). All calls use page/limit pagination
// params where the API supports them. Sensitive actions ask confirm()
// first. No secrets are ever shown or stored here except the demo token
// in localStorage for this starter.
const API = '/api';
let token = localStorage.getItem('wanas_token') || '';

function headers(extra) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = 'Bearer ' + token;
  return Object.assign(h, extra || {});
}
async function api(path, opts) {
  const res = await fetch(API + path, Object.assign({ headers: headers() }, opts || {}));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}
function esc(v) {
  return String(v === undefined || v === null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function table(rows, cols) {
  if (!rows.length) return '<p>لا توجد بيانات.</p>';
  const head = cols.map((c) => '<th>' + esc(c[1]) + '</th>').join('');
  const body = rows.map((r) => '<tr>' + cols.map((c) => '<td>' + esc(typeof c[0] === 'function' ? c[0](r) : r[c[0]]) + '</td>').join('') + '</tr>').join('');
  return '<table><tr>' + head + '</tr>' + body + '</table>';
}
function showSection(id) {
  document.querySelectorAll('.section').forEach((s) => s.classList.toggle('active', s.id === id));
  loadSection(id);
}
document.querySelectorAll('#sidebar button').forEach((b) => b.addEventListener('click', () => showSection(b.dataset.section)));

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  try {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username }) });
    token = data.token;
    localStorage.setItem('wanas_token', token);
    document.getElementById('loginStatus').textContent = 'تم الدخول: ' + esc(data.user.username) + ' (' + esc(data.user.role) + ') — ملاحظة: أدوار الإدارة الكاملة تتطلب حساب admin في بيئة حقيقية.';
    loadSection('overview');
  } catch (err) { document.getElementById('loginStatus').textContent = 'خطأ: ' + err.message; }
});

async function loadSection(id) {
  try {
    if (id === 'overview') {
      const healthRes = await fetch('/api/health');
      const health = await healthRes.json();
      document.getElementById('demoBanner').hidden = health.mode !== 'demo-ephemeral';
      try {
        const ov = await api('/admin/overview');
        document.getElementById('overviewStats').innerHTML = '<pre>' + esc(JSON.stringify(ov.stats, null, 2)) + '</pre>';
      } catch (err) { document.getElementById('overviewStats').textContent = 'نظرة عامة للإدارة تتطلب دور admin: ' + err.message; }
    }
    if (id === 'users') await loadUsers();
    if (id === 'rooms') { const d = await api('/rooms?page=1&limit=20'); document.getElementById('roomsTable').innerHTML = table(d.items, [['id', 'ID'], ['title', 'العنوان'], ['status', 'الحالة']]); }
    if (id === 'moments') await loadMoments();
    if (id === 'catalog') await loadCatalog();
    if (id === 'wallet') { const d = await api('/wallet/ledger?page=1&limit=20'); document.getElementById('ledgerTable').innerHTML = table(d.items, [['transactionId', 'رقم العملية'], ['type', 'النوع'], ['amount', 'المبلغ'], ['currency', 'العملة'], ['balanceAfter', 'الرصيد بعد']]); }
    if (id === 'agencies') {
      try { const a = await api('/agencies'); document.getElementById('agenciesTable').innerHTML = table(a.items, [['id', 'ID'], ['name', 'الاسم'], ['status', 'الحالة']]); } catch (e) { document.getElementById('agenciesTable').textContent = e.message; }
      try { const h = await api('/hosts'); document.getElementById('hostsTable').innerHTML = table(h.items, [['id', 'ID'], ['userId', 'المستخدم'], ['status', 'الحالة']]); } catch (e) { document.getElementById('hostsTable').textContent = e.message; }
      try { const r = await api('/recharge'); document.getElementById('rechargeTable').innerHTML = table(r.items, [['id', 'ID'], ['orderNumber', 'رقم الطلب'], ['amount', 'المبلغ'], ['status', 'الحالة']]); } catch (e) { document.getElementById('rechargeTable').textContent = e.message; }
    }
    if (id === 'games') {
      const d = await api('/games');
      document.getElementById('gamesTable').innerHTML = table(d.items, [['id', 'ID'], ['type', 'النوع'], ['status', 'الحالة']]);
      try { const c = await api('/games/config'); document.getElementById('gamesConfig').textContent = JSON.stringify(c.config, null, 2); } catch (e) { document.getElementById('gamesConfig').textContent = e.message; }
    }
    if (id === 'farm') { const d = await api('/farm'); document.getElementById('farmInfo').innerHTML = '<pre>' + esc(JSON.stringify(d.farm, null, 2)) + '</pre>'; }
    if (id === 'families') { const d = await api('/families'); document.getElementById('familiesTable').innerHTML = table(d.items, [['id', 'ID'], ['name', 'الاسم']]); }
    if (id === 'events') { const d = await api('/events'); document.getElementById('eventsTable').innerHTML = table(d.items, [['id', 'ID'], ['title', 'العنوان']]); }
    if (id === 'missions') { const d = await api('/missions'); document.getElementById('missionsTable').innerHTML = table(d.items, [['id', 'ID'], ['title', 'العنوان']]); }
    if (id === 'reports') { const d = await api('/admin/reports'); document.getElementById('reportsTable').innerHTML = table(d.items, [['id', 'ID'], ['reason', 'السبب'], ['status', 'الحالة']]); }
    if (id === 'bans') { const d = await api('/moderation/bans'); document.getElementById('bansTable').innerHTML = table(d.items, [['id', 'ID'], ['targetType', 'النوع'], ['targetId', 'الهدف'], ['status', 'الحالة'], ['reason', 'السبب']]); }
    if (id === 'settings') { const d = await api('/settings'); document.getElementById('settingsInfo').textContent = JSON.stringify(d, null, 2); }
  } catch (err) {
    // Show the error in the section instead of failing silently.
    const el = document.getElementById(id);
    if (el) { const p = document.createElement('p'); p.textContent = 'خطأ: ' + err.message; el.appendChild(p); }
  }
}
async function loadUsers() {
  const page = document.getElementById('usersPage').value || 1;
  const limit = document.getElementById('usersLimit').value || 20;
  const q = document.getElementById('usersSearch').value || '';
  const d = await api('/admin/users?page=' + page + '&limit=' + limit + '&q=' + encodeURIComponent(q));
  document.getElementById('usersTable').innerHTML = '<p>إجمالي: ' + d.total + '</p>' + table(d.items, [['id', 'ID'], ['username', 'الاسم'], ['role', 'الدور'], ['banned', 'محظور']]);
}
async function loadMoments() {
  const status = document.getElementById('momentsStatus').value;
  const d = await api('/moments?page=1&limit=20' + (status ? '&status=' + status : ''));
  document.getElementById('momentsTable').innerHTML = table(d.items, [['id', 'ID'], ['content', 'المحتوى'], ['status', 'الحالة']]);
}
async function loadCatalog() {
  const type = document.getElementById('catalogType').value;
  const status = document.getElementById('catalogStatus').value;
  const q = '?page=1&limit=20' + (type ? '&type=' + type : '') + (status ? '&status=' + status : '');
  const d = await api('/catalog' + q);
  document.getElementById('catalogTable').innerHTML = table(d.items, [['id', 'ID'], ['name', 'الاسم'], ['type', 'النوع'], ['status', 'الحالة'], ['special', 'خاص']]);
}
document.getElementById('usersSearchBtn').addEventListener('click', loadUsers);
document.getElementById('catalogSearchBtn').addEventListener('click', loadCatalog);
document.getElementById('refreshOverview').addEventListener('click', () => loadSection('overview'));
document.getElementById('momentsStatus').addEventListener('change', loadMoments);
document.getElementById('catalogForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try { await api('/catalog', { method: 'POST', body: JSON.stringify({ name: f.get('name'), type: f.get('type'), price: Number(f.get('price')), format: f.get('format'), special: f.get('special') === 'on' }) }); alert('تم الإنشاء كمسودة'); loadCatalog(); }
  catch (err) { alert('خطأ: ' + err.message); }
});
document.getElementById('validateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = document.getElementById('validateFile').files[0];
  const format = document.getElementById('validateFormat').value;
  const buf = await file.arrayBuffer();
  let binary = '';
  new Uint8Array(buf).forEach((b) => { binary += String.fromCharCode(b); });
  const base64 = btoa(binary);
  try {
    const data = await api('/catalog/validate', { method: 'POST', body: JSON.stringify({ format, base64 }) });
    document.getElementById('validateResult').textContent = JSON.stringify(data, null, 2);
  } catch (err) { document.getElementById('validateResult').textContent = 'خطأ: ' + err.message; }
});
document.getElementById('walletAdjustForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!confirm('تأكيد تعديل الرصيد؟ هذا إجراء حساس وسيُسجّل في سجل التدقيق.')) return;
  const f = new FormData(e.target);
  try {
    const data = await api('/wallet/adjust', { method: 'POST', headers: headers({ 'Idempotency-Key': f.get('idempotencyKey') }), body: JSON.stringify({ userId: f.get('userId'), type: f.get('type'), amount: Number(f.get('amount')), currency: f.get('currency'), reason: f.get('reason'), reference: f.get('reference') }) });
    alert('تم: ' + JSON.stringify(data.entry));
  } catch (err) { alert('خطأ: ' + err.message); }
});
document.getElementById('banForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!confirm('تأكيد الحظر؟')) return;
  const f = new FormData(e.target);
  try { await api('/moderation/ban', { method: 'POST', body: JSON.stringify({ targetType: f.get('targetType'), targetId: f.get('targetId'), reason: f.get('reason'), category: f.get('category'), scope: f.get('scope') || 'global' }) }); alert('تم الحظر'); loadSection('bans'); }
  catch (err) { alert('خطأ: ' + err.message); }
});
document.getElementById('agencyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try { await api('/agencies', { method: 'POST', body: JSON.stringify({ name: f.get('name') }) }); loadSection('agencies'); } catch (err) { alert('خطأ: ' + err.message); }
});
document.getElementById('hostInviteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try { await api('/hosts/invite', { method: 'POST', body: JSON.stringify({ userId: f.get('userId') }) }); loadSection('agencies'); } catch (err) { alert('خطأ: ' + err.message); }
});
document.getElementById('gamesPauseBtn').addEventListener('click', async () => {
  if (!confirm('تأكيد الإيقاف الطارئ للألعاب؟')) return;
  try { await api('/games/config', { method: 'PATCH', body: JSON.stringify({ emergencyPause: true }) }); alert('تم الإيقاف الطارئ'); } catch (err) { alert('خطأ: ' + err.message); }
});

// Catalog publish/delete/archive helpers are confirm-gated in the UI
// when wired to row actions; the API endpoints are /catalog/:id/publish,
// /catalog/:id/disable and /catalog/:id/archive (DELETE for hard-delete
// only when canDeleteItem allows it).
fetch('/api/health').then((r) => r.json()).then((h) => {
  document.getElementById('demoBanner').hidden = h.mode !== 'demo-ephemeral';
}).catch(() => {});
