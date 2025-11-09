import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';
import { getWalletAddressInfo } from '../openpayments/index.js';

const r = express.Router();

function toCents(v) {
  const n = Number(v);
  if (!isFinite(n)) return null;
  return Math.round(n * 100);
}

// ✔️ Moneda de la wallet del usuario autenticado
r.get('/my-asset', authMiddleware, async (req, res) => {
  try {
    const me = req.user;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(me.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const info = await getWalletAddressInfo(user.wallet_address_url);
    res.json({ assetCode: info.assetCode || null, assetScale: Number.isInteger(info.assetScale) ? info.assetScale : 2 });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo obtener la moneda de la wallet', details: String(e?.message || e) });
  }
});

// LIST
r.get('/', (_req, res) => {
  const list = db.prepare(`
    SELECT s.*, u.first_name as vendor_name, u.username as vendor_username
    FROM services s JOIN users u ON u.id = s.vendor_id
    ORDER BY s.id DESC
  `).all();
  res.json(list);
});

// CREATE (auto asset_code desde la wallet del vendedor)
r.post('/', authMiddleware, async (req, res) => {
  try {
    const me = req.user;
    if (!['vendedor','vendedor_cliente'].includes(me.role)) {
      return res.status(403).json({ error: 'No eres vendedor' });
    }
    const { title, description, price, saleType, billingIso } = req.body;
    if (!title) return res.status(400).json({ error: 'Falta título' });

    const priceCents = toCents(price);
    if (!Number.isInteger(priceCents) || priceCents <= 0) {
      return res.status(400).json({ error: 'Precio inválido. Usa número, ej: 10 -> 10.00' });
    }

    // Detectar moneda del vendedor (assetCode)
    const vendor = db.prepare('SELECT * FROM users WHERE id = ?').get(me.id);
    const vInfo = await getWalletAddressInfo(vendor.wallet_address_url);
    const assetCode = vInfo.assetCode || null;

    const sale = saleType === 'interval' ? 'interval' : 'oneshot';
    const billing = sale === 'interval'
      ? (typeof billingIso === 'string' && billingIso.trim() ? billingIso.trim() : 'PT1H')
      : null;

    const info = db.prepare(
      'INSERT INTO services (vendor_id, title, description, price_cents, asset_code, sale_type, billing_iso) VALUES (?,?,?,?,?,?,?)'
    ).run(me.id, title, description ?? '', priceCents, assetCode, sale, billing);

    const row = db.prepare('SELECT * FROM services WHERE id = ?').get(info.lastInsertRowid);
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: 'No se pudo crear el servicio', details: String(e?.message || e) });
  }
});

// UPDATE
r.put('/:id', authMiddleware, async (req, res) => {
  try {
    const me = req.user;
    const id = Number(req.params.id);
    const s = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    if (!s) return res.status(404).json({ error: 'Servicio no existe' });
    if (s.vendor_id !== me.id) return res.status(403).json({ error: 'No puedes editar este servicio' });

    const { title, description, price, saleType, billingIso } = req.body;

    let price_cents = undefined;
    if (price !== undefined) {
      price_cents = toCents(price);
      if (!Number.isInteger(price_cents) || price_cents <= 0) return res.status(400).json({ error: 'Precio inválido' });
    }

    // Re-detecta asset_code por si cambió la wallet del vendedor
    const vendor = db.prepare('SELECT * FROM users WHERE id = ?').get(me.id);
    const vInfo = await getWalletAddressInfo(vendor.wallet_address_url);
    const assetCode = vInfo.assetCode || s.asset_code;

    const sale = saleType === 'interval' ? 'interval' : (saleType === 'oneshot' ? 'oneshot' : s.sale_type);
    const billing = sale === 'interval'
      ? (typeof billingIso === 'string' && billingIso.trim() ? billingIso.trim() : (s.billing_iso || 'PT1H'))
      : null;

    db.prepare(`
      UPDATE services
      SET title = ?, description = ?, price_cents = COALESCE(?, price_cents),
          asset_code = ?, sale_type = ?, billing_iso = ?
      WHERE id = ?
    `).run(
      title ?? s.title,
      description ?? s.description,
      price_cents,
      assetCode,
      sale,
      billing,
      id
    );

    const row = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: 'No se pudo actualizar el servicio', details: String(e?.message || e) });
  }
});

// DELETE (cascada manual)
r.delete('/:id', authMiddleware, (req, res) => {
  try {
    const me = req.user;
    const id = Number(req.params.id);
    const s = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    if (!s) return res.status(404).json({ error: 'Servicio no existe' });
    if (s.vendor_id !== me.id) return res.status(403).json({ error: 'No puedes borrar este servicio' });

    const tx = db.transaction((serviceId) => {
      const chatIds = db.prepare('SELECT id FROM chats WHERE service_id = ?').all(serviceId).map(r => r.id);
      const delMsgs = db.prepare('DELETE FROM messages WHERE chat_id = ?');
      for (const cid of chatIds) delMsgs.run(cid);
      db.prepare('DELETE FROM chats WHERE service_id = ?').run(serviceId);
      db.prepare('DELETE FROM services WHERE id = ?').run(serviceId);
    });

    tx(id);
    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo eliminar', details: String(e?.message || e) });
  }
});

export default r;
