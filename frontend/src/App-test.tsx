import React from 'react';

function App() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0b0f',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '20px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <h1 style={{ fontSize: '48px', fontWeight: 'bold', margin: 0 }}>🎰 PowerSOL</h1>
      <p style={{ fontSize: '24px', margin: 0 }}>Frontend está funcionando!</p>
      <p style={{ fontSize: '16px', opacity: 0.7, margin: 0 }}>Se você vê isso, o React está renderizando corretamente</p>
      <div style={{
        marginTop: '40px',
        padding: '20px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '10px',
        maxWidth: '600px'
      }}>
        <p style={{ fontSize: '14px', marginBottom: '10px' }}>✅ Vite rodando</p>
        <p style={{ fontSize: '14px', marginBottom: '10px' }}>✅ React renderizando</p>
        <p style={{ fontSize: '14px', marginBottom: '10px' }}>✅ TypeScript compilando</p>
        <p style={{ fontSize: '14px', margin: 0 }}>✅ Servidor na porta 3000</p>
      </div>
    </div>
  );
}

export default App;
