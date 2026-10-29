@echo off
chcp 65001 > nul
title OrderTrack - Iniciador del Sistema
color 0B

echo ======================================================================
echo    ORDERTRACK - PLATAFORMA DE GESTIÓN Y SEGUIMIENTO DE PEDIDOS
echo    Universidad Privada del Norte (UPN) - Soluciones Web
echo ======================================================================
echo.

echo [1/3] Iniciando Servicio de Pedidos (API REST - Puerto 3001)...
start "OrderTrack - API Pedidos (3001)" cmd /k "cd services\orders-service && npm run dev"

echo [2/3] Iniciando Servicio en Tiempo Real (Socket.IO - Puerto 3002)...
start "OrderTrack - Realtime (3002)" cmd /k "cd services\realtime-service && npm run dev"

echo [3/3] Iniciando Frontend Angular (Puerto 4200)...
start "OrderTrack - Frontend Angular (4200)" cmd /k "cd frontend && npm start"

echo.
echo ======================================================================
echo    Todos los servicios se están iniciando en ventanas independientes.
echo.
echo    - Frontend Angular:   http://localhost:4200
echo    - API Pedidos:        http://localhost:3001
echo    - Realtime WebSockets: http://localhost:3002
echo ======================================================================
echo.
echo Abriendo navegador en http://localhost:4200 en 8 segundos...
timeout /t 8 /nobreak > nul
start http://localhost:4200

exit

