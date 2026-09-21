require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path    = require('path');
const { testConnection } = require('./db/database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(session({
  secret:            process.env.SESSION_SECRET || 'gis-secret',
  resave:            false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 8 * 60 * 60 * 1000 }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/map',      require('./routes/map'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/users',    require('./routes/users'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

testConnection().then(() => {
  app.listen(PORT, () => console.log('\n  ГИС Дороги: http://localhost:' + PORT + '\n'));
});
