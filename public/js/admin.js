const CMT_TYPE_LABEL   = { issue: 'Дефект', request: 'Заявка на ремонт', info: 'Запрос', other: 'Другое' };
const CMT_STATUS_LABEL = { active: 'Активно', pending: 'На рассмотрении', approved: 'Принято' };

async function loadUsers() {
  try {
    const r = await fetch('/api/users');
    if (!r.ok) return;
    const users = await r.json();
    const tbody = document.getElementById('users-tbody');
    const roleLabel = { admin: 'Администратор', user: 'Пользователь', customer: 'Заказчик' };
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:12px">Нет пользователей</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u => {
      const approveCell = !u.approved
        ? `<button class="approve-btn" onclick="approveUser(${u.id}, this)">Подтвердить</button>`
        : `<span style="color:var(--text3);font-size:11px">✓ активен</span>`;
      return `<tr>
        <td>${u.full_name}</td>
        <td style="color:var(--text3)">${u.login}</td>
        <td><span class="role-badge ${u.role}">${roleLabel[u.role] || u.role}</span></td>
        <td>${approveCell}</td>
      </tr>`;
    }).join('');
  } catch (e) { console.error('loadUsers:', e); }
}

async function approveUser(id, btn) {
  btn.disabled = true; btn.textContent = '…';
  try {
    const r = await fetch(`/api/users/${id}/approve`, { method: 'PATCH' });
    if (r.ok) { toast('Пользователь подтверждён', 'ok'); loadUsers(); }
    else { toast('Ошибка подтверждения', 'er'); btn.disabled = false; btn.textContent = 'Подтвердить'; }
  } catch { toast('Ошибка соединения', 'er'); btn.disabled = false; btn.textContent = 'Подтвердить'; }
}

async function loadAdminComments() {
  try {
    const r = await fetch('/api/comments');
    if (!r.ok) return;
    const cmts = await r.json();
    const el   = document.getElementById('admin-comments-list');
    if (!cmts.length) { el.innerHTML = '<div style="font-size:11.5px;color:var(--text3);padding:4px 0">Заявок нет</div>'; return; }
    el.innerHTML = cmts.map(c => `
      <div class="comment-card">
        <div class="comment-top">
          <span class="comment-obj">${c.object_name}</span>
          <span class="status-badge ${c.status}">${CMT_STATUS_LABEL[c.status] || c.status}</span>
        </div>
        <div class="comment-text"><em style="color:var(--text2);font-style:normal">${CMT_TYPE_LABEL[c.type] || c.type}:</em> ${c.text}</div>
        <div class="comment-meta">
          <span class="comment-author">${c.author_name} (${c.author_login})</span>
          <span>${String(c.created_at).slice(0, 16)}</span>
        </div>
        <select class="status-select" onchange="updateCommentStatus(${c.id}, this.value)">
          <option value="active"   ${c.status === 'active'   ? 'selected' : ''}>Активно</option>
          <option value="pending"  ${c.status === 'pending'  ? 'selected' : ''}>На рассмотрении</option>
          <option value="approved" ${c.status === 'approved' ? 'selected' : ''}>Принято</option>
        </select>
      </div>`
    ).join('');
  } catch (e) { console.error('loadAdminComments:', e); }
}

async function updateCommentStatus(id, status) {
  try {
    const r = await fetch(`/api/comments/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (r.ok) toast('Статус заявки обновлён', 'ok');
    else toast('Ошибка обновления статуса', 'er');
  } catch { toast('Ошибка соединения', 'er'); }
}
