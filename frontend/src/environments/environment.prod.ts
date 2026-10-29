// Detecta si el frontend está desplegado en Render.com o tras un proxy Nginx
const isRender = typeof window !== 'undefined' && window.location.hostname.includes('onrender.com');

export const environment = {
  production: true,
  ordersApiUrl: isRender
    ? 'https://ordertrack-orders-service.onrender.com/api'
    : '/api',
  realtimeUrl: isRender
    ? 'https://ordertrack-realtime-service.onrender.com'
    : '',
};
