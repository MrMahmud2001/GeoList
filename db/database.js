require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'gis_roads',
  charset:            'utf8mb4',
  waitForConnections: true,
  connectionLimit:    10
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('[DB] MySQL подключён: ' + process.env.DB_NAME);
    conn.release();
  } catch (err) {
    console.error('[DB] Ошибка подключения:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
