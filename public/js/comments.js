const TYPE_LABEL   = { issue: 'Дефект', request: 'Заявка на ремонт', info: 'Запрос', other: 'Другое' };
const STATUS_LABEL = { active: 'Активно', pending: 'На рассмотрении', approved: 'Принято' };

async function loadMyComments() {
  try {
    const r = await fetch('/api/comments');
    if (!r.ok) return;
    renderCustomerComments(await r.json());
  } catch (e) { console.error('loadMyComments:', e); }
}

function renderCustomerComments(cmts) {
  const el = document.getElementById('cmt-list');
  if (!el) return;
  if (!cmts.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-ico">💬</div><div class="empty-state-txt">Заявок пока нет</div></div>`;
    return;
  }
  el.innerHTML = cmts.map(c => `
    <div class="comment-card">
      <div class="comment-top">
        <span class="comment-obj">${c.object_name}</span>
        <span class="status-badge ${c.status}">${STATUS_LABEL[c.status] || c.status}</span>
      </div>
      <div class="comment-text"><em style="color:var(--text2);font-style:normal">${TYPE_LABEL[c.type] || c.type}:</em> ${c.text}</div>
      <div class="comment-meta"><span>${String(c.created_at).slice(0, 16)}</span></div>
    </div>`
  ).join('');
}

function updateCommentObjectList() {
  const sel = document.getElementById('cmt-obj-sel');
  if (!sel) return;
  const names = window.features.map((f, i) => f.properties?.name || 'Объект ' + (i + 1));
  sel.innerHTML = names.length
    ? names.map(n => `<option>${n}</option>`).join('')
    : '<option value="">— нет объектов на карте —</option>';
  if (window.currentObjName) {
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === window.currentObjName) { sel.selectedIndex = i; break; }
    }
  }
}

function openCommentModal(preselect) {
  updateCommentObjectList();
  document.getElementById('cmt-err').style.display = 'none';
  document.getElementById('cmt-text').value = '';
  if (preselect) {
    const sel = document.getElementById('cmt-obj-sel');
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === preselect) { sel.selectedIndex = i; break; }
    }
  }
  document.getElementById('cmt-overlay').classList.add('on');
}

function closeCommentModal() { document.getElementById('cmt-overlay').classList.remove('on'); }

async function submitComment() {
  const obj   = document.getElementById('cmt-obj-sel').value;
  const type  = document.getElementById('cmt-type-sel').value;
  const text  = document.getElementById('cmt-text').value.trim();
  const errEl = document.getElementById('cmt-err');
  errEl.style.display = 'none';
  if (!text) { errEl.textContent = 'Введите описание'; errEl.style.display = 'block'; return; }
  if (!obj)  { errEl.textContent = 'Выберите объект';  errEl.style.display = 'block'; return; }
  try {
    const r = await fetch('/api/comments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ object_name: obj, type, text })
    });
    const data = await r.json();
    if (!r.ok) { errEl.textContent = data.error || 'Ошибка'; errEl.style.display = 'block'; return; }
    closeCommentModal();
    toast('Заявка отправлена', 'ok');
    setTab('role');
    loadMyComments();
  } catch { errEl.textContent = 'Ошибка соединения'; errEl.style.display = 'block'; }
}
