import React from 'react';

function App() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '20px',
      fontFamily: 'Inter, sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '48px', fontWeight: 'bold', margin: 0 }}>
        PowerSOL
      </h1>
      <p style={{ fontSize: '24px', margin: 0 }}>
        Frontend funcionando!
      </p>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '20px',
        borderRadius: '10px',
        maxWidth: '500px'
      }}>
        <p style={{ fontSize: '16px', opacity: 0.9, margin: 0 }}>
          Sistema carregado com sucesso. Agora vamos adicionar o router e os componentes.
        </p>
      </div>
    </div>
  );
}

export default App;
