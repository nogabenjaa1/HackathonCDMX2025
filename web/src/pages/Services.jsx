import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useConfirm } from '../components/Confirm.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Services({ user, onEdit }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const confirm = useConfirm();
  const { push } = useToast();

  async function load(){
    setLoading(true);
    try {
      const d = await api.listServices();
      setList(d);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function buy(s){
    setProcessingId(s.id);
    const { approveUrl } = await api.startPurchase(s.id);
    window.location.href = approveUrl; // misma ventana
  }

  async function startInterval(s){
    setProcessingId(s.id);
    const { approveUrl } = await api.startPurchaseInterval(s.id);
    window.location.href = approveUrl;
  }

  async function onDelete(id, title){
    const ok = await confirm({
      title: 'Eliminar servicio',
      message: `¿Seguro que deseas eliminar “${title}”? Esta acción borrará también los chats y mensajes relacionados.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });
    if (!ok) return;
    try {
      await api.deleteService(id);
      push('Servicio eliminado', 'success');
      await load();
    } catch (e) {
      push('No se pudo eliminar el servicio', 'error');
    }
  }

  if (loading) return <p style={{padding:16, color:'#666'}}>Cargando…</p>;

  return (
    <div style={{display:'grid', gap:12}}>
      {list.map(s => {
        const isOwner = user && user.id === s.vendor_id;
        const isProc = processingId === s.id;
        return (
          <div key={s.id} style={{border:'1px solid #eee', padding:12, borderRadius:12, position:'relative', overflow:'hidden'}}>
            {isProc && <div style={veil}><div className="spin" style={spinner}/></div>}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <b>{s.title}</b>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <div style={{color:'#111', fontWeight:600}}>{(s.price_cents/100).toFixed(2)} {s.asset_code ?? ''}</div>
                {isOwner && (
                  <>
                    <button onClick={() => onEdit(s)} style={secondary}>Editar</button>
                    <button onClick={() => onDelete(s.id, s.title)} style={danger}>Eliminar</button>
                  </>
                )}
              </div>
            </div>
            <div style={{color:'#666', marginTop:4}}>{s.description}</div>
            <div style={{color:'#555', fontSize:12, marginTop:6}}>
              <i>Vendedor:</i> {s.vendor_name || s.vendor_username} · <i>Tipo:</i> {s.sale_type}{s.sale_type==='interval' ? ` (${s.billing_iso})` : ''}
            </div>
            {user && !isOwner && (
              <div style={{marginTop:10, display:'flex', gap:8}}>
                {s.sale_type === 'oneshot'
                  ? <button onClick={() => buy(s)} style={primary}>Comprar</button>
                  : <button onClick={() => startInterval(s)} style={primary}>Usar (pay-per-use)</button>}
              </div>
            )}
            <style>{`
              .spin { animation: spin 1s linear infinite; }
              @keyframes spin { from{transform: rotate(0)} to{transform: rotate(360deg)} }
            `}</style>
          </div>
        );
      })}
      {list.length === 0 && <div style={{color:'#666'}}>No hay servicios publicados aún.</div>}
    </div>
  );
}

const primary = { padding:'8px 12px', border:'1px solid #111', background:'#111', color:'#fff', borderRadius:8, cursor:'pointer' };
const secondary = { padding:'8px 12px', border:'1px solid #ddd', background:'#f7f7f7', color:'#111', borderRadius:8, cursor:'pointer' };
const danger = { padding:'8px 12px', border:'1px solid #c00', background:'#fff5f5', color:'#c00', borderRadius:8, cursor:'pointer' };
const veil = { position:'absolute', inset:0, background:'rgba(255,255,255,.75)', display:'grid', placeItems:'center' };
const spinner = { width:28, height:28, border:'3px solid #111', borderTopColor:'transparent', borderRadius:'50%' };
