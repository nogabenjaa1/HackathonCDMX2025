import React, { useState } from 'react';
import { api, setToken } from '../api';

const BASE = (import.meta.env.VITE_INTERLEDGER_BASE || 'https://ilp.interledger-test.dev').replace(/\/$/, '');

export default function Signup({ onAuthed }) {
  const [form, setForm] = useState({ username:'', firstName:'', password:'', role:'cliente' });
  const [err, setErr] = useState('');
  const onChange = (e) => { setErr(''); setForm({ ...form, [e.target.name]: e.target.value }); };

  async function submit(e){
    e.preventDefault();
    try {
      const { token, user } = await api.signup(form);
      setToken(token); onAuthed(user);
    } catch (e) {
      try { setErr(JSON.parse(String(e.message)).error || 'Error al registrar'); }
      catch { setErr('Error al registrar'); }
    }
  }

  const walletPreview = form.username ? `${BASE}/${form.username}` : `${BASE}/<tu-usuario>`;

  return (
    <form onSubmit={submit} style={{display:'grid', gap:10, background:'#fff', border:'1px solid #eee', borderRadius:12, padding:16}}>
      <h2 style={{margin:'4px 0 8px'}}>Crear cuenta</h2>

      <label style={{display:'grid', gap:6}}>
        <span style={{fontSize:12, color:'#555'}}>Nombre (público)</span>
        <input name="firstName" placeholder="Tu nombre" value={form.firstName} onChange={onChange}
               style={input} required />
      </label>

      <label style={{display:'grid', gap:6}}>
        <span style={{fontSize:12, color:'#555'}}>Usuario Interledger</span>
        <div style={{display:'flex', alignItems:'center', gap:6}}>
          <span style={prefix}>{BASE}/</span>
          <input name="username" placeholder="tu-usuario" value={form.username} onChange={onChange}
                 style={{...input, flex:1}} required />
        </div>
        <small style={{color:'#777'}}>Tu wallet será: <code>{walletPreview}</code></small>
      </label>

      <label style={{display:'grid', gap:6}}>
        <span style={{fontSize:12, color:'#555'}}>Contraseña</span>
        <input type="password" name="password" placeholder="password" value={form.password} onChange={onChange} style={input} required />
      </label>

      <label style={{display:'grid', gap:6}}>
        <span style={{fontSize:12, color:'#555'}}>Rol</span>
        <select name="role" value={form.role} onChange={onChange} style={{...input, paddingRight:8}}>
          <option value="cliente">Cliente</option>
          <option value="vendedor_cliente">Vendedor/Cliente</option>
          <option value="vendedor">Solo Vendedor</option>
        </select>
      </label>

      {err && <div style={{background:'#fff6f6', border:'1px solid #ffd7d7', color:'#a40000', padding:'8px 10px', borderRadius:8}}>{err}</div>}

      <button style={primary}>Crear cuenta</button>
    </form>
  );
}

const input = { padding:'10px 12px', border:'1px solid #ddd', borderRadius:8, background:'#fff' };
const prefix = { background:'#f3f3f3', padding:'10px 10px', border:'1px solid #ddd', borderRadius:8, fontSize:12 };
const primary = { padding:'10px 12px', border:'1px solid #222', background:'#111', color:'#fff', borderRadius:8, cursor:'pointer' };
