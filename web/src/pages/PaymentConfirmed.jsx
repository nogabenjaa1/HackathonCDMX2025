import React, { useEffect, useState } from 'react';

// simple animation (pulse + confetti made with CSS)
export default function PaymentConfirmed({ onOpenChat }) {
  const [state, setState] = useState({ status: 'pending', pid: null, chatId: null, msg: '' });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const status = q.get('status') || 'ok';
    const pid = q.get('pid');
    const chatId = q.get('chatId');
    const msg = q.get('msg') || '';
    setState({ status, pid, chatId, msg });

    // redirect automático al chat después de 1500ms si ok
    if (status === 'ok' && chatId) {
      const t = setTimeout(() => onOpenChat?.(Number(chatId)), 1500);
      return () => clearTimeout(t);
    }
  }, [onOpenChat]);

  if (state.status !== 'ok') {
    return (
      <div style={wrap}>
        <div style={card}>
          <h2 style={{marginTop:0}}>Pago no completado</h2>
          <p style={{color:'#a00'}}>{state.msg || 'Ocurrió un error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={confetti} aria-hidden />
      <div style={card}>
        <div style={checkWrap}>
          <div style={check} className="pulse">✓</div>
        </div>
        <h2 style={{margin:'8px 0 4px'}}>Payment Confirmed</h2>
        <p style={{margin:'0 0 10px'}}>Payment ID: <code>{state.pid}</code></p>
        <small style={{color:'#666'}}>Redirigiendo al chat…</small>
      </div>
      <style>{css}</style>
    </div>
  );
}

const wrap = { display:'grid', placeItems:'center', minHeight:'60vh', position:'relative' };
const card = { background:'#fff', border:'1px solid #eee', borderRadius:16, padding:'20px 24px', textAlign:'center', boxShadow:'0 6px 20px rgba(0,0,0,0.06)' };
const checkWrap = { display:'grid', placeItems:'center', margin:'6px auto 8px' };
const check = { width:64, height:64, borderRadius:'50%', background:'#12b886', color:'#fff', display:'grid', placeItems:'center', fontSize:34, fontWeight:700, boxShadow:'0 6px 14px rgba(18,184,134,.4)' };
const confetti = {
  position:'fixed', inset:0, background:
    'radial-gradient(circle at 20% 20%, rgba(18,184,134,.08), transparent 40%),' +
    'radial-gradient(circle at 80% 30%, rgba(17,17,17,.04), transparent 40%),' +
    'radial-gradient(circle at 40% 80%, rgba(18,184,134,.08), transparent 40%)',
  pointerEvents:'none'
};

const css = `
.pulse { animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(18,184,134,.5); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 12px rgba(18,184,134,0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(18,184,134,0); }
}
`;
