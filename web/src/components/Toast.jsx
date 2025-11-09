import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastCtx = createContext(null);
export function useToast(){ const v = useContext(ToastCtx); if (!v) throw new Error('useToast must be used within <ToastProvider>'); return v; }

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const push = useCallback((msg, type='info') => {
    const id = Math.random().toString(36).slice(2);
    setItems(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div style={wrap}>
        {items.map(t => (
          <div key={t.id} style={{...toast, borderColor: color[t.type]}}>
            <div style={{fontWeight:600, color:color[t.type]}}>{label[t.type]}</div>
            <div style={{color:'#222'}}>{t.msg}</div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

const wrap = { position:'fixed', right:16, bottom:16, display:'grid', gap:10, zIndex:1001 };
const toast = { minWidth:260, maxWidth:360, background:'#fff', border:'1px solid', borderRadius:12, padding:'10px 12px', boxShadow:'0 8px 30px rgba(0,0,0,.12)' };
const color = { info:'#0b7285', success:'#2b8a3e', error:'#c92a2a', warn:'#e67700' };
const label = { info:'Info', success:'Éxito', error:'Error', warn:'Aviso' };
