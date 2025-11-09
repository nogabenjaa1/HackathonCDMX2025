import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Inbox({ onOpen }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load(){
    setLoading(true);
    const d = await api.listChats();
    setRows(d);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading) return <p style={{padding:16, color:'#666'}}>Cargando chats…</p>;
  if (rows.length === 0) return <p style={{padding:16, color:'#666'}}>Sin conversaciones aún.</p>;

  return (
    <div style={{display:'grid', gap:10}}>
      {rows.map(r => (
        <div key={r.chat_id} style={card} onClick={()=>onOpen?.(r.chat_id)}>
          <div style={{display:'flex', justifyContent:'space-between', gap:8}}>
            <div>
              <b>{r.service_title}</b>
              <div style={{color:'#555', fontSize:12}}>
                Comprador: {r.buyer_name || `#${r.buyer_id}`} · Vendedor: {r.vendor_name || `#${r.vendor_id}`}
              </div>
            </div>
            <div style={{color:'#777', fontSize:12}}>
              {r.last_at ? new Date(r.last_at).toLocaleString() : ''}
            </div>
          </div>
          {r.last_text && <div style={{color:'#333', marginTop:6, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.last_text}</div>}
        </div>
      ))}
    </div>
  );
}

const card = { border:'1px solid #eee', padding:12, borderRadius:12, background:'#fff', cursor:'pointer' };
