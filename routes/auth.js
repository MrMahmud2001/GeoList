const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const { pool } = require('../db/database');

router.post('/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) return res.status(400).json({ error: 'Введите логин и пароль' });
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE login = ?', [login.trim()]);
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    if (!user.approved)
      return res.status(403).json({ error: 'Аккаунт ожидает подтверждения администратором' });
    req.session.user = { id: user.id, login: user.login, full_name: user.full_name, role: user.role };
    return res.json(req.session.user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/register', async (req, res) => {
  const { login, password, full_name, role } = req.body;
  if (!login || !password || !full_name) return res.status(400).json({ error: 'Заполните все поля' });
  if (!['user', 'customer'].includes(role)) return res.status(400).json({ error: 'Недопустимая роль' });
  if (login.trim().length < 3) return res.status(400).json({ error: 'Логин — минимум 3 символа' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль — минимум 6 символов' });
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE login = ?', [login.trim()]);
    if (existing.length) return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
    const hash = bcrypt.hashSync(password, 10);
    await pool.query('INSERT INTO users (login, password_hash, full_name, role, approved) VALUES (?,?,?,?,1)',
      [login.trim(), hash, full_name.trim(), role]);
    return res.status(201).json({ message: 'Регистрация выполнена. Войдите в систему.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/logout', (req, res) => { req.session.destroy(); res.json({ message: 'Выход выполнен' }); });

router.get('/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Не авторизован' });
  res.json(req.session.user);
});

module.exports = router;
