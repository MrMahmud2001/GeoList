const express = require('express');
const router  = express.Router();
const { pool } = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/upload', requireRole('admin'), async (req, res) => {
  const { filename, kml_data } = req.body;
  if (!filename || !kml_data) return res.status(400).json({ error: 'Нет данных файла' });
  const cnt = (kml_data.match(/<Placemark/g) || []).length;
  try {
    await pool.query('INSERT INTO map_uploads (filename, uploaded_by, features_count, kml_data) VALUES (?,?,?,?)',
      [filename, req.session.user.id, cnt, kml_data]);
    return res.json({ message: 'Карта загружена', features_count: cnt });
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.get('/latest', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.id, m.filename, m.uploaded_at, m.features_count, m.kml_data, u.full_name AS uploaded_by_name
       FROM map_uploads m JOIN users u ON u.id = m.uploaded_by ORDER BY m.id DESC LIMIT 1`);
    if (!rows.length) return res.status(404).json({ error: 'Карта ещё не загружена' });
    return res.json(rows[0]);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.get('/history', requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.id, m.filename, m.uploaded_at, m.features_count, u.full_name AS uploaded_by_name
       FROM map_uploads m JOIN users u ON u.id = m.uploaded_by ORDER BY m.id DESC LIMIT 20`);
    return res.json(rows);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;
