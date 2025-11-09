import React, { useEffect, useState } from 'react';
import Services from './pages/Services.jsx';
import MyServiceForm from './pages/MyServiceNew.jsx';
import Signup from './pages/Signup.jsx';
import Login from './pages/Login.jsx';
import PaymentConfirmed from './pages/PaymentConfirmed.jsx';
import Chat from './pages/Chat.jsx';
import Inbox from './pages/Inbox.jsx';
import MyAccount from './pages/MyAccount.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { ConfirmProvider } from './components/Confirm.jsx';

export default function App(){
  const [user, setUser] = useState(null);
  const [view, setView] = useState('signup');
  const [editing, setEditing] = useState(null);
  const [chatId, setChatId] = useState(null);

  useEffect(() => {
    const cached = sessionStorage.getItem('user');
    if (cached) { setUser(JSON.parse(cached)); setView('home'); }
    if (window.location.pathname === '/payment-confirmed') setView('confirmed');
  }, []);

  function onAuthed(u){ setUser(u); sessionStorage.setItem('user', JSON.stringify(u)); setView('home'); }
  function logout(){ localStorage.removeItem('tok'); sessionStorage.removeItem('user'); setUser(null); setView('signup'); }

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div style={{minHeight:'100vh', background:'#fff'}}>
          <header style={{display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid #eee'}}>
            <b onClick={()=>setView(user?'home':'signup')} style={{cursor:'pointer'}}>Open Payments Marketplace</b>
            <div style={{marginLeft:'auto', display:'flex', gap:8, alignItems:'center'}}>
              {user && <>
                <button onClick={()=>setView('inbox')} style={tab(view==='inbox')}>Chats</button>
                {/* Solo nombre/usuario, sin rol aquí */}
                <button onClick={()=>setView('account')} style={tab(view==='account')}>
                  {user.first_name || user.username}
                </button>
                <button onClick={logout} style={btn}>Salir</button>
              </>}
            </div>
          </header>

          {!user ? (
            <div style={{minHeight:'calc(100vh - 58px)', display:'grid', placeItems:'center', background:'#fafafa'}}>
              <div style={{width:'100%', maxWidth: 520, padding: 24}}>
                <div style={{display:'flex', gap:8, marginBottom:16}}>
                  <button onClick={()=>setView('signup')} style={tab(view==='signup')}>Crear cuenta</button>
                  <button onClick={()=>setView('login')} style={tab(view==='login')}>Iniciar sesión</button>
                </div>
                {view==='signup' ? <Signup onAuthed={onAuthed} /> : <Login onAuthed={onAuthed} />}
              </div>
            </div>
          ) : (
            <div style={{maxWidth:1000, margin:'0 auto', padding:16}}>
              {view==='home' && (
                <>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                    <h2 style={{margin:0}}>Servicios</h2>
                    {(user.role === 'vendedor' || user.role === 'vendedor_cliente') && (
                      <button onClick={() => { setEditing(null); setView('new'); }} style={primary}>Agregar servicio</button>
                    )}
                  </div>
                  <Services user={user} onEdit={(s)=>{ setEditing(s); setView('edit'); }} />
                </>
              )}

              {view==='inbox' && <Inbox onOpen={(cid)=>{ setChatId(cid); setView('chat'); }} />}

              {view==='new' && <MyServiceForm onSaved={()=>setView('home')} />}

              {view==='edit' && editing && <MyServiceForm service={editing} onSaved={()=>{ setEditing(null); setView('home'); }} />}

              {view==='confirmed' && <PaymentConfirmed onOpenChat={(cid)=>{ setChatId(cid); setView('chat'); }} />}

              {view==='chat' && chatId && <Chat chatId={chatId} me={user} onBack={()=>setView('inbox')} />}

              {view==='account' && <MyAccount onSaved={(u)=>{ setUser(u); setView('home'); }} />}
            </div>
          )}
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}

const btn = { padding:'8px 10px', border:'1px solid #ddd', background:'#f7f7f7', borderRadius:8, cursor:'pointer' };
const tab = (active) => ({ padding:'8px 12px', border:'1px solid #ddd', background: active ? '#fff' : '#f3f3f3', borderRadius:8, cursor:'pointer' });
const primary = { padding:'8px 12px', border:'1px solid #111', background:'#111', color:'#fff', borderRadius:8, cursor:'pointer' };
