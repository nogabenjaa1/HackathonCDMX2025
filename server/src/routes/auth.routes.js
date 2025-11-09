import express from 'express';
import db from '../db.js';
import { hashPassword, verifyPassword, signJwt, authMiddleware } from '../auth.js';

const r = express.Router();

const BASE = (process.env.INTERLEDGER_BASE || 'https://ilp.interledger-test.dev').replace(/\/$/, '');
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-_.]{1,30})$/i;
const ROLES = new Set(['cliente','vendedor','vendedor_cliente']);

/** ---------- Auth básica ---------- **/

r.post('/signup', async (req, res) => {
  try {
    const { username, firstName, password, role } = req.body;
    if (!username || !firstName || !password) {
      return res.status(400).json({ error: 'username, firstName y password son requeridos' });
    }
    if (!USERNAME_RE.test(username)) return res.status(400).json({ error: 'username inválido' });

    const roleNorm = ROLES.has(role) ? role : 'cliente';
    const walletAddressUrl = `${BASE}/${username.toLowerCase()}`;

    const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username.toLowerCase());
    if (exists) return res.status(409).json({ error: 'Username ya registrado' });

    const pwHash = await hashPassword(password);
    const info = db.prepare('INSERT INTO users (username, first_name, password_hash, wallet_address_url, role) VALUES (?,?,?,?,?)')
      .run(username.toLowerCase(), firstName, pwHash, walletAddressUrl, roleNorm);

    const user = { id: info.lastInsertRowid, username: username.toLowerCase(), first_name: firstName, wallet_address_url: walletAddressUrl, role: roleNorm };
    const token = signJwt(user);
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ error: 'Error signup', details: String(e) });
  }
});

r.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username y password requeridos' });
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase());
  if (!row) return res.status(401).json({ error: 'Credenciales inválidas' });
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
  const user = { id: row.id, username: row.username, first_name: row.first_name, wallet_address_url: row.wallet_address_url, role: row.role };
  const token = signJwt(user);
  res.json({ token, user });
});

/** ---------- NUEVO: Perfil (/api/auth/me) ---------- **/

// Obtener mis datos actuales
r.get('/me', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT id, username, first_name, wallet_address_url, role FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(row);
});

// Actualizar mis datos (nombre, username/wallet, rol, y contraseña opcional)
r.put('/me', authMiddleware, async (req, res) => {
  try {
    const me = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!me) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { firstName, username, role, currentPassword, newPassword } = req.body;

    // Rol (opcional)
    let roleVal = me.role;
    if (role !== undefined) {
      if (!ROLES.has(role)) return res.status(400).json({ error: 'Rol inválido' });
      roleVal = role;
    }

    // Username/wallet (opcional)
    let uname = me.username;
    let walletUrl = me.wallet_address_url;
    if (username !== undefined && username !== me.username) {
      if (!USERNAME_RE.test(username)) return res.status(400).json({ error: 'username inválido' });
      const exists = db.prepare('SELECT 1 FROM users WHERE username = ? AND id <> ?').get(username.toLowerCase(), me.id);
      if (exists) return res.status(409).json({ error: 'Username ya registrado' });
      uname = username.toLowerCase();
      walletUrl = `${BASE}/${uname}`;
    }

    // Cambio de password (opcional)
    if (newPassword !== undefined && newPassword !== '') {
      if (!currentPassword) return res.status(400).json({ error: 'currentPassword requerido para cambiar la contraseña' });
      const ok = await verifyPassword(currentPassword, me.password_hash);
      if (!ok) return res.status(401).json({ error: 'currentPassword incorrecto' });
      const newHash = await hashPassword(newPassword);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, me.id);
    }

    // Persistir
    db.prepare('UPDATE users SET first_name = ?, username = ?, wallet_address_url = ?, role = ? WHERE id = ?')
      .run(firstName ?? me.first_name, uname, walletUrl, roleVal, me.id);

    const row = db.prepare('SELECT id, username, first_name, wallet_address_url, role FROM users WHERE id = ?').get(me.id);
    const token = signJwt(row);
    res.json({ token, user: row });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo actualizar la cuenta', details: String(e?.message || e) });
  }
});

export default r;
