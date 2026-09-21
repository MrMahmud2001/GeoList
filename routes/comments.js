const express = require('express');
const router  = express.Router();
const { pool } = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/', requireRole('customer'), async (req, res) => {
  const { object_name, type, text } = req.body;
  if (!object_name || !type || !text) return res.status(400).json({ error: 'Заполните все поля' });
  if (!['issue','request','info','other'].includes(type)) return res.status(400).json({ error: 'Недопустимый тип' });
  try {
    await pool.query('INSERT INTO comments (object_name, type, text, author_id) VALUES (?,?,?,?)',
      [object_name, type, text.trim(), req.session.user.id]);
    return res.status(201).json({ message: 'Заявка отправлена' });
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.get('/', requireAuth, async (req, res) => {
  const user = req.session.user;
  try {
    let rows;
    if (user.role === 'admin') {
      [rows] = await pool.query(
        `SELECT c.*, u.full_name AS author_name, u.login AS author_login
         FROM comments c JOIN users u ON u.id = c.author_id ORDER BY c.id DESC`);
    } else if (user.role === 'customer') {
      [rows] = await pool.query(
        `SELECT c.*, u.full_name AS author_name FROM comments c JOIN users u ON u.id = c.author_id
         WHERE c.author_id = ? ORDER BY c.id DESC`, [user.id]);
    } else {
      return res.json([]);
    }
    return res.json(rows);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.patch('/:id/status', requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  if (!['active','pending','approved'].includes(status)) return res.status(400).json({ error: 'Недопустимый статус' });
  try {
    const [result] = await pool.query('UPDATE comments SET status = ? WHERE id = ?', [status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Заявка не найдена' });
    return res.json({ message: 'Статус обновлён' });
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;
