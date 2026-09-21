function enterApp() {
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-register').classList.add('hidden');
  document.getElementById('app').classList.add('on');

  const roleNames = { user: 'Пользователь', admin: 'Администратор', customer: 'Заказчик' };
  const roleAbbr  = { user: 'П', admin: 'А', customer: 'З' };
  const tabLabels = { user: 'Справка', admin: 'Управление', customer: 'Заявки' };

  const u = window.currentUser;
  document.getElementById('user-avatar').textContent   = roleAbbr[u.role]  || '?';
  document.getElementById('user-fullname').textContent = u.full_name;
  document.getElementById('user-role-lbl').textContent = roleNames[u.role] || u.role;
  document.getElementById('t-role').textContent        = tabLabels[u.role] || 'Панель';

  document.getElementById('rp-admin').style.display    = u.role === 'admin'    ? 'block' : 'none';
  document.getElementById('rp-user').style.display     = u.role === 'user'     ? 'block' : 'none';
  document.getElementById('rp-customer').style.display = u.role === 'customer' ? 'block' : 'none';

  if (!window.mapInst) initMap();

  loadLatestMap();

  if (u.role === 'admin') {
    loadUploadHistory();
    loadUsers();
    loadAdminComments();
  }
  if (u.role === 'customer') {
    loadMyComments();
  }
}

function setTab(t) {
  ['objects', 'legend', 'role'].forEach(id => {
    document.getElementById('t-' + id).classList.toggle('on', id === t);
    document.getElementById('p-' + id).classList.toggle('on', id === t);
  });
}

let _toastTimer;
function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = (type === 'ok' ? '✓ ' : type === 'er' ? '✕ ' : '') + msg;
  el.className   = 'on ' + (type || '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('on'), 3200);
}
