const express = require('express');
const router  = express.Router();
const { pool } = require('../db/database');
const { requireRole } = require('../middleware/auth');

router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, login, full_name, role, approved, created_at FROM users ORDER BY id DESC');
    return res.json(rows);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.patch('/:id/approve', requireRole('admin'), async (req, res) => {
  try {
    const [result] = await pool.query('UPDATE users SET approved = 1 WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Пользователь не найден' });
    return res.json({ message: 'Пользователь подтверждён' });
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;
