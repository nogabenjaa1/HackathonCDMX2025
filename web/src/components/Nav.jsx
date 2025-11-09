import React from 'react';

export default function Nav({ user, onLogout }) {
  return (
    <nav style={{display:'flex',gap:16, padding:12, borderBottom:'1px solid #ddd'}}>
      <b>Open Payments Marketplace</b>
      <span style={{flex:1}}/>
      {user ? (
        <>
          <span>{user.first_name || user.username} ({user.role})</span>
          <button onClick={onLogout}>Salir</button>
        </>
      ) : (
        <span>Invitado</span>
      )}
    </nav>
  );
}