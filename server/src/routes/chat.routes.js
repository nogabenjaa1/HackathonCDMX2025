import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const r = express.Router();

r.get('/', authMiddleware, (req, res) => {
  const me = req.user.id;
  const rows = db.prepare(`
    SELECT c.id as chat_id, c.service_id, c.buyer_id, c.vendor_id, c.sale_type, c.expires_at, c.locked,
           s.title as service_title,
           u_b.first_name as buyer_name, u_v.first_name as vendor_name,
           (SELECT text FROM messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) as last_text,
           (SELECT created_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) as last_at
    FROM chats c
      JOIN services s ON s.id = c.service_id
      JOIN users u_b ON u_b.id = c.buyer_id
      JOIN users u_v ON u_v.id = c.vendor_id
    WHERE c.buyer_id = ? OR c.vendor_id = ?
    ORDER BY datetime(COALESCE(last_at, c.created_at)) DESC
  `).all(me, me);
  res.json(rows);
});

r.get('/:id', authMiddleware, (req, res) => {
  const me = req.user;
  const id = Number(req.params.id);
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(id);
  if (!chat) return res.status(404).json({ error: 'Chat no existe' });
  if (chat.buyer_id !== me.id && chat.vendor_id !== me.id) return res.status(403).json({ error: 'No autorizado' });
  const svc = db.prepare('SELECT id, title FROM services WHERE id = ?').get(chat.service_id);
  res.json({ chat, service: svc });
});

r.get('/:id/messages', authMiddleware, (req, res) => {
  const me = req.user;
  const id = Number(req.params.id);
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(id);
  if (!chat) return res.status(404).json({ error: 'Chat no existe' });
  if (chat.buyer_id !== me.id && chat.vendor_id !== me.id) return res.status(403).json({ error: 'No autorizado' });
  const msgs = db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY id ASC').all(id);
  res.json(msgs);
});

// Enviar mensaje (bloquea si locked)
r.post('/:id/messages', authMiddleware, (req, res) => {
  const me = req.user;
  const id = Number(req.params.id);
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(id);
  if (!chat) return res.status(404).json({ error: 'Chat no existe' });
  if (chat.buyer_id !== me.id && chat.vendor_id !== me.id) return res.status(403).json({ error: 'No autorizado' });
  if (chat.locked && me.id === chat.buyer_id) return res.status(402).json({ error: 'Sesión expirada. Renueva para seguir chateando.' });

  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Mensaje vacío' });

  const info = db.prepare('INSERT INTO messages (chat_id, sender_id, text) VALUES (?,?,?)').run(id, me.id, text.trim());
  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
  res.json(row);
});

export default r;
