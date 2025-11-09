import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useConfirm } from '../components/Confirm.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Chat({ chatId, onBack, me }) {
  const [chat, setChat] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [remaining, setRemaining] = useState(null);
  const bottomRef = useRef(null);
  const confirm = useConfirm();
  const { push } = useToast();

  async function loadAll() {
    const c = await api.getChat(chatId);
    setChat(c);
    const m = await api.listMessages(chatId);
    setMsgs(m);
  }

  useEffect(() => { loadAll(); }, [chatId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  useEffect(() => {
    const t = setInterval(async () => {
      const m = await api.listMessages(chatId);
      setMsgs(m);
    }, 2500);
    return () => clearInterval(t);
  }, [chatId]);

  useEffect(() => {
    if (!chat?.chat?.expires_at) { setRemaining(null); return; }
    const tick = () => { setRemaining(new Date(chat.chat.expires_at).getTime() - Date.now()); };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [chat?.chat?.expires_at]);

  const expired = chat?.chat?.sale_type === 'interval' && (remaining !== null && remaining <= 0);
  const locked = !!chat?.chat?.locked;
  const blocked = chat?.chat?.sale_type === 'interval' && (expired || locked);

  async function renew() {
    const ok = await confirm({
      title: 'Renovar sesión',
      message: 'Se solicitará una nueva autorización de pago para extender la sesión.',
      confirmText: 'Renovar',
      cancelText: 'Cancelar'
    });
    if (!ok) return;
    try {
      const { approveUrl } = await api.renewInterval(chatId);
      window.location.href = approveUrl; // misma ventana
    } catch {
      push('No se pudo iniciar la renovación', 'error');
    }
  }

  async function send(e) {
    e.preventDefault();
    const val = text.trim();
    if (!val) return;
    if (blocked) { push('Sesión expirada. Renueva para seguir chateando.', 'warn'); return; }
    const m = await api.sendMessage(chatId, val);
    setMsgs(prev => [...prev, m]);
    setText('');
  }

  if (!chat) return <p style={{ padding: 16 }}>Cargando chat…</p>;
  const title = chat.service?.title || `Servicio #${chat.chat?.service_id}`;

  function fmt(ms) {
    if (ms == null) return '';
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(s / 60), ss = s % 60;
    return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  }

  return (
    <div style={{ display: 'grid', gap: 10, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBack} style={back}>← Volver</button>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {(chat.chat.sale_type === 'interval') && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: blocked ? '#c00' : '#12b886' }}>
              {blocked ? 'Sesión expirada' : `Tiempo restante: ${fmt(remaining)}`}
            </span>
          </div>
        )}
      </div>

      <div style={thread} aria-hidden={blocked}>
        {msgs.map(m => {
          const mine = m.sender_id === me?.id;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              <div style={{ ...bubble, background: mine ? '#111' : '#f3f3f3', color: mine ? '#fff' : '#111' }}>
                <div style={{ fontSize: 12, opacity: .75, marginBottom: 4 }}>
                  {mine ? 'Tú' : `Usuario #${m.sender_id}`} · {new Date(m.created_at).toLocaleString()}
                </div>
                <div>{m.text}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Escribe un mensaje…" style={{ flex: 1, ...input }} disabled={blocked} />
        <button style={primary} disabled={blocked}>Enviar</button>
      </form>

      {/* ✔️ Overlay de bloqueo para intervalos */}
      {blocked && (
        <div style={veil}>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={dot} /> <b>Tu sesión ha expirado</b>
            </div>
            <p style={{ margin: '0 0 14px', color: '#555' }}>
              Para seguir usando el servicio necesitas autorizar un nuevo pago por el siguiente intervalo.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onBack} style={secondary}>Abandonar</button>
              <button onClick={renew} style={primary}>Renovar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const input = { padding: '12px 14px', border: '1px solid #ddd', borderRadius: 10, background: '#fff' };
const thread = { border: '1px solid #eee', borderRadius: 12, padding: 12, minHeight: 300, background: '#fff', position: 'relative' };
const bubble = { maxWidth: '70%', borderRadius: 12, padding: '8px 10px', boxShadow: '0 2px 8px rgba(0,0,0,.05)' };
const back = { padding: '6px 10px', border: '1px solid #ddd', background: '#f7f7f7', borderRadius: 8, cursor: 'pointer' };
const primary = { padding: '10px 14px', border: '1px solid #111', background: '#111', color: '#fff', borderRadius: 10, cursor: 'pointer' };
const secondary = { padding: '10px 14px', border: '1px solid #ddd', background: '#f7f7f7', color: '#111', borderRadius: 10, cursor: 'pointer' };
const veil = { position: 'absolute', inset: 0, background: 'rgba(255,255,255,.9)', display: 'grid', placeItems: 'center', zIndex: 5 };
const card = { width: 'min(92vw, 420px)', background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '16px 16px 14px', boxShadow: '0 10px 40px rgba(0,0,0,.18)' };
const dot = { width: 10, height: 10, borderRadius: '50%', background: '#c92a2a' };