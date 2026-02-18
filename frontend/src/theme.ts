export const theme = {
  colors: {
    bg: '#0a0b0f',
    card: '#0f1117',
    cardHover: '#131621',
    neonBlue: '#3ecbff',
    neonPink: '#ff4ecd',
    neonCyan: '#2fffe2',
    neonPurple: '#b347ff',
    neonOrange: '#b347ff', // Changed from orange to purple
    success: '#3CF79E',
    warning: '#FFC34E',
    danger: '#FF5E5E',
    text: '#ffffff',
    textMuted: '#a1a1aa',
    border: '#27272a',
  },
  shadows: {
    neonGlow: '0 0 20px rgba(62,203,255,.35), 0 0 40px rgba(47,255,226,.25)',
    neonGlowPink: '0 0 20px rgba(255,78,205,.35), 0 0 40px rgba(255,78,205,.25)',
    neonGlowPurple: '0 0 20px rgba(179,71,255,.35), 0 0 40px rgba(179,71,255,.25)',
    cardGlow: '0 0 30px rgba(62,203,255,.1)',
    buttonGlow: '0 0 15px rgba(62,203,255,.5)',
  },
  gradients: {
    neon: 'linear-gradient(135deg, #3ecbff 0%, #ff4ecd 50%, #2fffe2 100%)',
    card: 'linear-gradient(135deg, rgba(15,17,23,.8) 0%, rgba(19,22,33,.8) 100%)',
    button: 'linear-gradient(135deg, #3ecbff 0%, #2fffe2 100%)',
    specialEvent: 'linear-gradient(135deg, #b347ff 0%, #ff7847 100%)',
  }
};

export const animations = {
  duration: {
    fast: 0.2,
    normal: 0.3,
    slow: 0.5,
  },
  ease: [0.4, 0, 0.2, 1],
};