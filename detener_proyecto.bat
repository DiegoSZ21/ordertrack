@echo off
chcp 65001 > nul
title OrderTrack - Detener Servicios
color 0C

echo ======================================================================
echo    Deteniendo procesos de OrderTrack (Node.js en puertos 3001, 3002, 4200)
echo ======================================================================
echo.

taskkill /F /IM node.exe /T 2>nul

echo.
echo Todos los servicios han sido detenidos correctamente.
echo.
pause
exit

