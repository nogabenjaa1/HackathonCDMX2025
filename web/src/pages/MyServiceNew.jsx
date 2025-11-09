import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../components/Toast.jsx';

const BILLING_MAP = { minute: 'PT1M', hour: 'PT1H', day: 'P1D' };

export default function MyServiceForm({ service, onSaved }){
  const { push } = useToast();
  const isEdit = !!service;
  const [asset, setAsset] = useState({ code: '', scale: 2 });
  const [loadingAsset, setLoadingAsset] = useState(true);

  const [form, setForm] = useState({
    title: service?.title || '',
    description: service?.description || '',
    price: service ? (service.price_cents/100).toFixed(2) : '10',
    saleType: service?.sale_type || 'oneshot',
    billing: service?.billing_iso ? revMap(service.billing_iso) : 'hour',
  });

  function revMap(iso){ return Object.entries(BILLING_MAP).find(([,v]) => v===iso)?.[0] || 'hour'; }

  useEffect(() => {
    let mounted = true;
    async function loadAsset(){
      try {
        const a = await api.getMyAsset();
        if (mounted) setAsset({ code: a.assetCode || '', scale: a.assetScale ?? 2 });
      } catch {
        if (mounted) setAsset({ code: '', scale: 2 });
      } finally {
        if (mounted) setLoadingAsset(false);
      }
    }
    loadAsset();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (service) {
      setForm({
        title: service.title,
        description: service.description || '',
        price: (service.price_cents/100).toFixed(2),
        saleType: service.sale_type || 'oneshot',
        billing: service.billing_iso ? revMap(service.billing_iso) : 'hour',
      });
    }
  }, [service]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e){
    e.preventDefault();
    const body = {
      title: form.title,
      description: form.description,
      price: form.price,
      saleType: form.saleType,
      billingIso: form.saleType === 'interval' ? BILLING_MAP[form.billing] : null
    };
    try {
      const s = isEdit ? await api.updateService(service.id, body) : await api.createService(body);
      push(isEdit ? 'Servicio actualizado' : 'Servicio publicado', 'success');
      onSaved?.(s);
    } catch {
      push('No se pudo guardar el servicio', 'error');
    }
  }

  return (
    <form onSubmit={submit} style={{display:'grid', gap:10, background:'#fff', border:'1px solid #eee', borderRadius:12, padding:16}}>
      <h2 style={{margin:'4px 0 8px'}}>{isEdit ? 'Editar servicio' : 'Nuevo servicio'}</h2>

      <label style={{display:'grid', gap:6}}>
        <span style={{fontSize:12, color:'#555'}}>Título</span>
        <input name="title" placeholder="Título del servicio" value={form.title} onChange={onChange} style={input} required />
      </label>

      <label style={{display:'grid', gap:6}}>
        <span style={{fontSize:12, color:'#555'}}>Descripción</span>
        <textarea name="description" placeholder="Describe tu servicio" value={form.description} onChange={onChange} style={{...input, minHeight:90}} />
      </label>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
        <label style={{display:'grid', gap:6}}>
          <span style={{fontSize:12, color:'#555'}}>Precio</span>
          <div style={{display:'flex', alignItems:'center', gap:6}}>
            <span style={prefix}>$</span>
            <input name="price" type="number" step="0.01" min="0.01" value={form.price} onChange={onChange} style={{...input, flex:1}} />
          </div>
          <small style={{color:'#777'}}>Se guarda como centavos (assetScale=2). La moneda se detecta de tu wallet.</small>
        </label>

        <label style={{display:'grid', gap:6}}>
          <span style={{fontSize:12, color:'#555'}}>Moneda (de tu wallet)</span>
          <input value={loadingAsset ? 'Detectando…' : (asset.code || '—')} disabled readOnly style={{...input, background:'#f8f9fa', color:'#555'}} />
        </label>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
        <label style={{display:'grid', gap:6}}>
          <span style={{fontSize:12, color:'#555'}}>Tipo de venta</span>
          <select name="saleType" value={form.saleType} onChange={onChange} style={input}>
            <option value="oneshot">Uso único</option>
            <option value="interval">Pago por uso (intervalo)</option>
          </select>
        </label>

        {form.saleType === 'interval' && (
          <label style={{display:'grid', gap:6}}>
            <span style={{fontSize:12, color:'#555'}}>Cobro por</span>
            <select name="billing" value={form.billing} onChange={onChange} style={input}>
              <option value="minute">Minuto</option>
              <option value="hour">Hora</option>
              <option value="day">Día</option>
            </select>
          </label>
        )}
      </div>

      <div style={{display:'flex', gap:8}}>
        <button style={primary}>{isEdit ? 'Guardar cambios' : 'Publicar'}</button>
      </div>
    </form>
  );
}

const input = { padding:'10px 12px', border:'1px solid #ddd', borderRadius:8, background:'#fff' };
const prefix = { background:'#f3f3f3', padding:'10px 10px', border:'1px solid #ddd', borderRadius:8, fontSize:12 };
const primary = { padding:'10px 12px', border:'1px solid #111', background:'#111', color:'#fff', borderRadius:8, cursor:'pointer' };
