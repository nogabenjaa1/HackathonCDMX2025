import React, { useState } from 'react';
import { api, setToken } from '../api';

export default function Login({ onAuthed }) {
  const [form, setForm] = useState({ username:'', password:'' });
  const [err, setErr] = useState('');
  const onChange = (e) => { setErr(''); setForm({ ...form, [e.target.name]: e.target.value }); };

  async function submit(e){
    e.preventDefault();
    try {
      const { token, user } = await api.login(form);
      setToken(token); onAuthed(user);
    } catch (e) {
      try { setErr(JSON.parse(String(e.message)).error || 'Error al iniciar sesión'); }
      catch { setErr('Error al iniciar sesión'); }
    }
  }

  return (
    <form onSubmit={submit} style={{display:'grid', gap:10, background:'#fff', border:'1px solid #eee', borderRadius:12, padding:16}}>
      <h2 style={{margin:'4px 0 8px'}}>Iniciar sesión</h2>

      <label style={{display:'grid', gap:6}}>
        <span style={{fontSize:12, color:'#555'}}>Usuario</span>
        <input name="username" placeholder="tu-usuario" value={form.username} onChange={onChange} style={input} required />
      </label>

      <label style={{display:'grid', gap:6}}>
        <span style={{fontSize:12, color:'#555'}}>Contraseña</span>
        <input type="password" name="password" placeholder="password" value={form.password} onChange={onChange} style={input} required />
      </label>

      {err && <div style={{background:'#fff6f6', border:'1px solid #ffd7d7', color:'#a40000', padding:'8px 10px', borderRadius:8}}>{err}</div>}

      <button style={primary}>Entrar</button>
    </form>
  );
}

const input = { padding:'10px 12px', border:'1px solid #ddd', borderRadius:8, background:'#fff' };
const primary = { padding:'10px 12px', border:'1px solid #222', background:'#111', color:'#fff', borderRadius:8, cursor:'pointer' };
