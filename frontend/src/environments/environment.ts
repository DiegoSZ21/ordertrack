// Detecta dinámicamente si estamos en localhost, en una IP de red local (ej. 192.168.x.x o 10.x.x.x) o en un dominio público
const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';

export const environment = {
  production: false,
  ordersApiUrl: `http://${host}:3001/api`,
  realtimeUrl: `http://${host}:3002`,
};
