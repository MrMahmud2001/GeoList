function showScreen(name) {
  document.getElementById('screen-login').classList.toggle('hidden', name !== 'login');
  document.getElementById('screen-register').classList.toggle('hidden', name !== 'register');
  ['login-err', 'reg-err', 'reg-ok'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  });
}

function showMsg(id, msg, ok) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className   = ok ? 'msg-ok' : 'msg-error';
  el.style.display = 'block';
}

async function doLogin() {
  const login    = document.getElementById('login-inp').value.trim();
  const password = document.getElementById('login-pass').value;
  if (!login || !password) { showMsg('login-err', 'Введите логин и пароль'); return; }

  const btn = document.getElementById('btn-login');
  btn.disabled = true; btn.textContent = 'Вход…';
  try {
    const r = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    });
    const d = await r.json();
    if (!r.ok) { showMsg('login-err', d.error || 'Ошибка входа'); return; }
    window.currentUser = d;
    enterApp();
  } catch { showMsg('login-err', 'Ошибка соединения с сервером'); }
  finally { btn.disabled = false; btn.textContent = 'Войти'; }
}

async function doRegister() {
  const full_name = document.getElementById('reg-name').value.trim();
  const login     = document.getElementById('reg-login').value.trim();
  const password  = document.getElementById('reg-pass').value;
  const role      = document.getElementById('reg-role').value;

  ['reg-err', 'reg-ok'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });

  if (!full_name || !login || !password) { showMsg('reg-err', 'Заполните все поля'); return; }

  try {
    const r = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password, full_name, role })
    });
    const d = await r.json();
    if (!r.ok) { showMsg('reg-err', d.error || 'Ошибка регистрации'); return; }
    showMsg('reg-ok', d.message, true);
    document.getElementById('reg-name').value = document.getElementById('reg-login').value = document.getElementById('reg-pass').value = '';
    setTimeout(() => showScreen('login'), 2200);
  } catch { showMsg('reg-err', 'Ошибка соединения с сервером'); }
}

async function doLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.currentUser = null;
  window.features    = [];
  if (window.mapInst) { window.mapInst.remove(); window.mapInst = null; window.mkLayer = null; }
  document.getElementById('app').classList.remove('on');
  showScreen('login');
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const ls = document.getElementById('screen-login');
  const rs = document.getElementById('screen-register');
  if (ls && !ls.classList.contains('hidden')) doLogin();
  else if (rs && !rs.classList.contains('hidden')) doRegister();
});
