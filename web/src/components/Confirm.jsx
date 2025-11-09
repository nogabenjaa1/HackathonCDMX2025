import React, { createContext, useContext, useState, useCallback } from 'react';

const ConfirmCtx = createContext(null);

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx.confirm;
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, title: '', message: '', confirmText: 'Confirmar', cancelText: 'Cancelar', resolve: null });

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: opts?.title || '¿Confirmar?',
        message: opts?.message || '',
        confirmText: opts?.confirmText || 'Sí',
        cancelText: opts?.cancelText || 'No',
        resolve
      });
    });
  }, []);

  function onClose(result) {
    state.resolve?.(result);
    setState(s => ({ ...s, open: false, resolve: null }));
  }

  return (
    <ConfirmCtx.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div style={veil}>
          <div style={card}>
            <h3 style={{margin:'0 0 6px'}}>{state.title}</h3>
            {state.message && <p style={{margin:'0 0 14px', color:'#555'}}>{state.message}</p>}
            <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
              <button onClick={() => onClose(false)} style={secondary}>{state.cancelText}</button>
              <button onClick={() => onClose(true)} style={primary}>{state.confirmText}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

const veil = { position:'fixed', inset:0, background:'rgba(0,0,0,.28)', display:'grid', placeItems:'center', zIndex:1000 };
const card = { width:'min(92vw, 420px)', background:'#fff', border:'1px solid #eee', borderRadius:12, padding:'16px 16px 14px', boxShadow:'0 10px 40px rgba(0,0,0,.18)' };
const primary = { padding:'8px 12px', border:'1px solid #111', background:'#111', color:'#fff', borderRadius:8, cursor:'pointer' };
const secondary = { padding:'8px 12px', border:'1px solid #ddd', background:'#f7f7f7', color:'#111', borderRadius:8, cursor:'pointer' };
