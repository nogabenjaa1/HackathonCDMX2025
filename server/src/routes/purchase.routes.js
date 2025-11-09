import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';
import { resolvePaymentGlobals } from '../config/globals.js';
import { getWalletAddressInfo } from '../openpayments/index.js';
import { IncomingGrant, CreateIncomingPayment } from '../openpayments/incomingpayments.js';
import {
  createSenderQuoteGrant,
  createQuoteFromSender,
  getQuoteFromSender,
  requestOutgoingPaymentInteractiveGrant,
  requestOutgoingPaymentIntervalGrant,
  finalizeInteractiveGrant,
  createOutgoingPayment
} from '../openpayments/outgoingpayments.js';
import { randomUUID } from 'crypto';

const r = express.Router();
const pendingPurchases = new Map(); // nonce -> ctx { mode, ... }

function createOrGetChat({ serviceId, buyerId, vendorId, saleType, expiresAt }) {
  const row = db.prepare('SELECT * FROM chats WHERE service_id = ? AND buyer_id = ?').get(serviceId, buyerId);
  if (row) {
    db.prepare('UPDATE chats SET sale_type = COALESCE(?, sale_type), expires_at = COALESCE(?, expires_at), locked = 0 WHERE id = ?')
      .run(saleType ?? null, expiresAt ?? null, row.id);
    return row.id;
  }
  const info = db.prepare('INSERT INTO chats (service_id, buyer_id, vendor_id, sale_type, expires_at, locked) VALUES (?, ?, ?, ?, ?, 0)')
    .run(serviceId, buyerId, vendorId, saleType ?? null, expiresAt ?? null);
  return info.lastInsertRowid;
}

function insertSystemMessage({ chatId, senderId, text }) {
  db.prepare('INSERT INTO messages (chat_id, sender_id, text) VALUES (?,?,?)')
    .run(chatId, senderId, text);
}

function durationMs(iso) {
  // Soportamos PT1M, PT1H, P1D (y similares sencillos)
  if (!iso) return 0;
  const m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/i);
  if (!m) return 0;
  const days = Number(m[1]||0), hours = Number(m[2]||0), mins = Number(m[3]||0);
  return ((days*24 + hours)*60 + mins) * 60 * 1000;
}

// ONE-SHOT
r.post('/start/:serviceId', authMiddleware, async (req, res) => {
  try {
    const me = req.user;
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(Number(req.params.serviceId));
    if (!service) return res.status(404).json({ error: 'Servicio no existe' });
    const vendor = db.prepare('SELECT * FROM users WHERE id = ?').get(service.vendor_id);

    const { senderWalletUrl, receiverWalletUrl, amountCents } = resolvePaymentGlobals({ buyer: me, service, vendor });
    const receiverInfo = await getWalletAddressInfo(receiverWalletUrl);
    const inGrant = await IncomingGrant(receiverInfo.authServer);
    const incomingPaymentId = await CreateIncomingPayment(receiverInfo, inGrant.token, { valueCents: amountCents });

    const senderInfo = await getWalletAddressInfo(senderWalletUrl);
    const quoteGrant = await createSenderQuoteGrant(senderInfo.authServer);
    const quoteId = await createQuoteFromSender(quoteGrant.token, senderInfo, incomingPaymentId);
    const quote = await getQuoteFromSender(quoteGrant.token, quoteId);

    const nonce = randomUUID();
    const callbackUrl = `${process.env.PUBLIC_BASE_URL}${process.env.INTERACT_CALLBACK_PATH}`;
    const pending = await requestOutgoingPaymentInteractiveGrant(senderInfo, quote, { callbackUrl, nonce });

    pendingPurchases.set(nonce, { mode:'oneshot', me, vendor, service, senderInfo, receiverInfo, quote, continueAccessToken: pending.continueAccessToken, continueUri: pending.continueUri });
    res.json({ approveUrl: pending.interactUrl, nonce });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo iniciar la compra', details: String(e?.message || e) });
  }
});

// INTERVAL (inicio)
r.post('/start-interval/:serviceId', authMiddleware, async (req, res) => {
  try {
    const me = req.user;
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(Number(req.params.serviceId));
    if (!service) return res.status(404).json({ error: 'Servicio no existe' });
    const vendor = db.prepare('SELECT * FROM users WHERE id = ?').get(service.vendor_id);

    const { senderWalletUrl, receiverWalletUrl, amountCents } = resolvePaymentGlobals({ buyer: me, service, vendor });

    const receiverInfo = await getWalletAddressInfo(receiverWalletUrl);
    const inGrant = await IncomingGrant(receiverInfo.authServer);
    const incomingPaymentId = await CreateIncomingPayment(receiverInfo, inGrant.token, { valueCents: amountCents });

    const senderInfo = await getWalletAddressInfo(senderWalletUrl);
    const quoteGrant = await createSenderQuoteGrant(senderInfo.authServer);
    const quoteId = await createQuoteFromSender(quoteGrant.token, senderInfo, incomingPaymentId);
    const quote = await getQuoteFromSender(quoteGrant.token, quoteId);

    const nowIso = new Date().toISOString();
    const durationIso = service.billing_iso || 'PT1H';
    const intervalIso = `R/${nowIso}/${durationIso}`;

    const nonce = randomUUID();
    const callbackUrl = `${process.env.PUBLIC_BASE_URL}${process.env.INTERACT_CALLBACK_PATH}`;
    const pending = await requestOutgoingPaymentIntervalGrant(senderInfo, quote, intervalIso, { callbackUrl, nonce });

    pendingPurchases.set(nonce, { mode:'interval', me, vendor, service, senderInfo, receiverInfo, quote, durationIso, continueAccessToken: pending.continueAccessToken, continueUri: pending.continueUri });
    res.json({ approveUrl: pending.interactUrl, nonce, intervalIso });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo iniciar la compra por intervalo', details: String(e?.message || e) });
  }
});

// INTERVAL (renovar)
r.post('/interval/renew/:chatId', authMiddleware, async (req, res) => {
  try {
    const me = req.user;
    const chatId = Number(req.params.chatId);
    const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat no existe' });
    if (chat.buyer_id !== me.id) return res.status(403).json({ error: 'No puedes renovar este chat' });

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(chat.service_id);
    const vendor = db.prepare('SELECT * FROM users WHERE id = ?').get(chat.vendor_id);

    const { senderWalletUrl, receiverWalletUrl, amountCents } = resolvePaymentGlobals({ buyer: me, service, vendor });

    const receiverInfo = await getWalletAddressInfo(receiverWalletUrl);
    const inGrant = await IncomingGrant(receiverInfo.authServer);
    const incomingPaymentId = await CreateIncomingPayment(receiverInfo, inGrant.token, { valueCents: amountCents });

    const senderInfo = await getWalletAddressInfo(senderWalletUrl);
    const quoteGrant = await createSenderQuoteGrant(senderInfo.authServer);
    const quoteId = await createQuoteFromSender(quoteGrant.token, senderInfo, incomingPaymentId);
    const quote = await getQuoteFromSender(quoteGrant.token, quoteId);

    const nowIso = new Date().toISOString();
    const durationIso = service.billing_iso || 'PT1H';
    const intervalIso = `R/${nowIso}/${durationIso}`;

    const nonce = randomUUID();
    const callbackUrl = `${process.env.PUBLIC_BASE_URL}${process.env.INTERACT_CALLBACK_PATH}`;
    const pending = await requestOutgoingPaymentIntervalGrant(senderInfo, quote, intervalIso, { callbackUrl, nonce });

    // Guardamos que esto es una renovación y a qué chat corresponde
    pendingPurchases.set(nonce, {
      mode:'renew', chatId, me, vendor, service, senderInfo, receiverInfo, quote, durationIso,
      continueAccessToken: pending.continueAccessToken, continueUri: pending.continueUri
    });

    res.json({ approveUrl: pending.interactUrl, nonce, intervalIso });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo iniciar la renovación', details: String(e?.message || e) });
  }
});

// CALLBACK
r.get('/callback', async (req, res) => {
  const origin = process.env.ORIGIN || 'http://localhost:5173';
  try {
    const interactRef = req.query.interact_ref;
    const nonce = req.query.nonce;
    const ctx = nonce ? pendingPurchases.get(nonce) : Array.from(pendingPurchases.values()).at(-1);
    if (!ctx) return res.status(400).send('No hay contexto de compra pendiente');

    const accessToken = await finalizeInteractiveGrant(ctx.continueAccessToken, ctx.continueUri, interactRef);
    const paymentId = await createOutgoingPayment(ctx.senderInfo, accessToken, ctx.quote);

    // calcular expiración si es interval
    let chatId;
    if (ctx.mode === 'interval' || ctx.mode === 'renew') {
      const ms = durationMs(ctx.durationIso || ctx.service?.billing_iso || 'PT1H');
      const expiresAt = new Date(Date.now() + ms).toISOString();
      const saleType = 'interval';

      chatId = ctx.mode === 'renew'
        ? (db.prepare('UPDATE chats SET locked = 0, expires_at = ? WHERE id = ?').run(expiresAt, ctx.chatId), ctx.chatId)
        : createOrGetChat({ serviceId: ctx.service.id, buyerId: ctx.me.id, vendorId: ctx.vendor.id, saleType, expiresAt });

      insertSystemMessage({ chatId, senderId: ctx.me.id, text: `✅ Payment confirmed (renew). Payment ID: ${paymentId}` });
    } else {
      // oneshot: crea chat sin expiración
      chatId = createOrGetChat({ serviceId: ctx.service.id, buyerId: ctx.me.id, vendorId: ctx.vendor.id, saleType:'oneshot', expiresAt: null });
      insertSystemMessage({ chatId, senderId: ctx.me.id, text: `✅ Payment confirmed. Payment ID: ${paymentId}` });
    }

    if (nonce) pendingPurchases.delete(nonce);
    res.redirect(`${origin}/payment-confirmed?status=ok&pid=${encodeURIComponent(paymentId)}&chatId=${chatId}`);
  } catch (e) {
    // Si fue renovación, bloquear el chat
    try {
      const nonce = req.query.nonce;
      const ctx = nonce ? pendingPurchases.get(nonce) : null;
      if (ctx?.mode === 'renew' && ctx?.chatId) {
        db.prepare('UPDATE chats SET locked = 1 WHERE id = ?').run(ctx.chatId);
        insertSystemMessage({ chatId: ctx.chatId, senderId: ctx.vendor.id, text: '❌ Renovación rechazada. El chat fue bloqueado.' });
      }
      if (nonce) pendingPurchases.delete(nonce);
    } catch {}

    res.redirect(`${origin}/payment-confirmed?status=error&msg=${encodeURIComponent(String(e))}`);
  }
});

export default r;
