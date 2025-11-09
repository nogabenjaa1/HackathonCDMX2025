import React, { useEffect, useState, useMemo } from 'react';
import { api, setToken } from '../api';
import { useToast } from '../components/Toast.jsx';

const BASE = (import.meta.env.VITE_INTERLEDGER_BASE || 'https://ilp.interledger-test.dev').replace(/\/$/, '');

function roleLabel(r){
  if (r === 'cliente') return 'Cliente';
  if (r === 'vendedor') return 'Vendedor';
  if (r === 'vendedor_cliente') return 'Vendedor/Cliente';
  return r || '—';
}

export default function MyAccount({ onSaved }) {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [me, setMe] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    username: '',
    role: 'cliente',
    currentPassword: '',
    newPassword: '',
  });

  // Cargar mis datos actuales al entrar
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const m = await api.me();
        if (!mounted) return;
        setMe(m);
        setForm({
          firstName: m.first_name || '',
          username: m.username || '',
          role: m.role || 'cliente',
          currentPassword: '',
          newPassword: '',
        });
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const walletPreview = useMemo(
    () => (form.username ? `${BASE}/${form.username}` : `${BASE}/<tu-usuario>`),
    [form.username]
  );

  function onChange(e){
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function save(e){
    e?.preventDefault?.();
    setSaving(true);
    try {
      const body = {
        firstName: form.firstName,
        username: form.username,
        role: form.role,
      };
      if (form.newPassword) {
        body.currentPassword = form.currentPassword;
        body.newPassword = form.newPassword;
      }
      const { token, user } = await api.updateMe(body);
      setToken(token);
      sessionStorage.setItem('user', JSON.stringify(user));
      setMe(user);
      setEditing(false);
      setForm(f => ({ ...f, currentPassword: '', newPassword: '' }));
      push('Cuenta actualizada', 'success');
      onSaved?.(user);
    } catch (err) {
      push('No se pudo actualizar la cuenta', 'error');
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit(){
    if (!me) return;
    setForm({
      firstName: me.first_name || '',
      username: me.username || '',
      role: me.role || 'cliente',
      currentPassword: '',
      newPassword: '',
    });
    setEditing(false);
  }

  if (loading) return <p style={{padding:16}}>Cargando…</p>;

  return (
    <div style={wrap}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
        <h2 style={{margin:0}}>Mi cuenta</h2>
        {!editing ? (
          <button style={primary} onClick={()=>setEditing(true)}>Editar</button>
        ) : (
          <div style={{display:'flex', gap:8}}>
            <button style={secondary} onClick={cancelEdit} disabled={saving}>Cancelar</button>
            <button style={primary} onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        )}
      </div>

      {/* VISTA: datos actuales (solo lectura) */}
      {!editing && (
        <div style={panel}>
          <Row label="Nombre público">{me.first_name || '—'}</Row>
          <Row label="Usuario Interledger">{me.username}</Row>
          <Row label="Wallet">
            <code>{me.wallet_address_url}</code>
          </Row>
          <Row label="Rol">{roleLabel(me.role)}</Row>
        </div>
      )}

      {/* FORM: editar */}
      {editing && (
        <form onSubmit={save} style={{display:'grid', gap:12}}>
          <label style={field}>
            <span style={label}>Nombre público</span>
            <input
              name="firstName"
              value={form.firstName}
              onChange={onChange}
              style={input}
              required
            />
          </label>

          <label style={field}>
            <span style={label}>Usuario Interledger</span>
            <div style={{display:'flex', gap:6, alignItems:'center'}}>
              <span style={prefix}>{BASE}/</span>
              <input
                name="username"
                value={form.username}
                onChange={onChange}
                style={{...input, flex:1}}
                required
              />
            </div>
            <small style={{color:'#777'}}>Tu wallet será: <code>{walletPreview}</code></small>
          </label>

          <label style={field}>
            <span style={label}>Rol</span>
            <select name="role" value={form.role} onChange={onChange} style={input}>
              <option value="cliente">Cliente</option>
              <option value="vendedor_cliente">Vendedor/Cliente</option>
              <option value="vendedor">Solo Vendedor</option>
            </select>
          </label>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <label style={field}>
              <span style={label}>Contraseña actual</span>
              <input
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={onChange}
                style={input}
                placeholder="Requerida si cambias la contraseña"
              />
            </label>
            <label style={field}>
              <span style={label}>Nueva contraseña</span>
              <input
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={onChange}
                style={input}
                placeholder="Dejar vacío para no cambiar"
              />
            </label>
          </div>

          <div style={{display:'flex', gap:8}}>
            <button type="button" style={secondary} onClick={cancelEdit} disabled={saving}>Cancelar</button>
            <button type="submit" style={primary} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      )}
    </div>
  );
}

function Row({ label, children }){
  return (
    <div style={{display:'grid', gridTemplateColumns:'160px 1fr', gap:12, padding:'8px 0', borderBottom:'1px dashed #eee'}}>
      <div style={{color:'#666'}}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

const wrap = { display:'grid', gap:12, background:'#fff', border:'1px solid #eee', borderRadius:12, padding:16, maxWidth:600 };
const panel = { border:'1px solid #f0f0f0', borderRadius:10, padding:12, background:'#fff' };
const field = { display:'grid', gap:6 };
const label = { fontSize:12, color:'#555' };
const input = { padding:'10px 12px', border:'1px solid #ddd', borderRadius:8, background:'#fff' };
const prefix = { background:'#f3f3f3', padding:'10px 10px', border:'1px solid #ddd', borderRadius:8, fontSize:12 };
const primary = { padding:'8px 12px', border:'1px solid #111', background:'#111', color:'#fff', borderRadius:8, cursor:'pointer' };
const secondary = { padding:'8px 12px', border:'1px solid #ddd', background:'#f7f7f7', color:'#111', borderRadius:8, cursor:'pointer' };
