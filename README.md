# OrderTrack — Plataforma Web Distribuida para la Gestión y Seguimiento de Pedidos en Tiempo Real

Proyecto Académico desarrollado para el curso **Soluciones Web y Aplicaciones Distribuidas** (VIII Ciclo) — **Universidad Privada del Norte (UPN), Perú**.

---

## 1. Descripción del Proyecto

**OrderTrack** es una solución web integral y distribuida diseñada para optimizar los flujos operativos de restaurantes y negocios gastronómicos. Resuelve la desconexión típica entre el cliente comensal, el personal de atención y la línea de cocina, proporcionando trazabilidad garantizada de estados y comunicación bidireccional en tiempo real sin recargar páginas.

### Problema abordado
En muchos negocios gastronómicos, los pedidos se gestionan mediante comandas en papel o aplicaciones aisladas sin sincronización instantánea, derivando en demoras, errores en comandas y falta de certidumbre para el cliente sobre el tiempo de espera.

### Solución propuesta
Una arquitectura desacoplada basada en microservicios y frontend reactivo con Angular Standalone Components, APIs REST en Node.js/Express, persistencia transaccional en PostgreSQL y difusión de eventos en tiempo real mediante WebSockets (Socket.IO) y RabbitMQ.

---

## 2. Arquitectura del Sistema

```
ordertrack/
├── frontend/                  # Cliente Angular 19 Standalone (SPA)
│   ├── src/app/core/          # Servicios, Modelos, Guards, Interceptores
│   └── src/app/features/      # Módulos funcionales (Menú, Cocina, Dashboard, Tracking)
├── services/
│   ├── orders-service/        # Gestión de pedidos, productos, auth y reglas de negocio
│   └── realtime-service/      # Hub de WebSockets (Socket.IO) con autorización y salas
├── docker-compose.yml         # Orquestación de contenedores
├── .env.example               # Plantilla de variables de entorno
└── README.md                  # Documentación técnica y académica
```

### Flujo de Estados del Negocio
El sistema implementa una máquina de estados controlada estrictamente en el backend:

```
[RECIBIDO] ──(Atención/Admin)──> [CONFIRMADO] ──(Cocina/Admin)──> [PREPARANDO]
                                                                        │
[ENTREGADO] <───(Atención/Admin)─── [LISTO] <──(Cocina/Admin)──────────┘
      ▲                                │
      └────── [EN_CAMINO] <────────────┘ (Para pedidos delivery)
```

*Cancelaciones:* Únicamente permitidas en estado `RECIBIDO` (cliente y personal) y `CONFIRMADO` (personal).

---

## 3. Credenciales de Demostración (Entorno Local)

| Rol | Correo Electrónico | Contraseña | Capacidades |
|---|---|---|---|
| **Administrador** | `admin@ordertrack.pe` | `Admin123!` | Dashboard analítico, gestión de carta, control de pedidos y reportes |
| **Atención** | `atencion@ordertrack.pe` | `Atencion123!` | Creación de pedidos, confirmación y despacho |
| **Cocina** | `cocina@ordertrack.pe` | `Cocina123!` | Tablero Kanban operativo, inicio y finalización de cocción |
| **Cliente** | `cliente1@ordertrack.pe` | `Cliente123!` | Carta digital, carrito interactivo y seguimiento en vivo |

---

## 4. Requisitos de Instalación Local

- **Node.js**: v18+ (probado y compatible con v24 LTS)
- **npm**: v9+
- **PostgreSQL**: v14+ (local o mediante contenedor Docker)
- **Docker & Docker Compose** (opcional, para despliegue automatizado)

---

## 5. Instrucciones de Arranque

### Opción A: Con Docker Compose (Recomendado)
```bash
# 1. Copiar variables de entorno
cp .env.example .env

# 2. Levantar los contenedores (PostgreSQL, RabbitMQ, Servicios y Frontend)
docker compose up -d --build

# 3. Aplicar migraciones y seed de demostración en el contenedor de pedidos
docker compose exec orders-service npm run prisma:deploy
docker compose exec orders-service npm run seed
```

### Opción B: Ejecución Local sin Docker

#### Paso 1: Configurar la Base de Datos
Crear una base de datos PostgreSQL llamada `ordertrack`:
```sql
CREATE DATABASE ordertrack;
```

#### Paso 2: Servicio de Pedidos (`orders-service`)
```bash
cd services/orders-service
cp ../../.env.example .env   # Ajustar DATABASE_URL con tus credenciales
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev                 # Escuchando en http://localhost:3001
```

#### Paso 3: Servicio de Tiempo Real (`realtime-service`)
```bash
cd services/realtime-service
npm install
npm run dev                 # Escuchando en http://localhost:3002
```

#### Paso 4: Frontend Angular
```bash
cd frontend
npm install
npm start                   # Disponible en http://localhost:4200
```

---

## 6. Endpoints Principales (API REST)

### Autenticación
- `POST /api/auth/login` — Autenticación con JWT (expiración de 8h).
- `GET /api/auth/me` — Datos del usuario autenticado.
- `POST /api/auth/refresh` — Renovación de access tokens.

### Productos
- `GET /api/products` — Consulta de carta con filtros y paginación.
- `POST /api/products` — Creación de nuevo producto (Admin).
- `PATCH /api/products/:id` — Actualización o toggle de disponibilidad.

### Pedidos
- `POST /api/orders` — Registro de nuevo pedido (cálculo de totales transaccional en servidor).
- `GET /api/orders` — Listado con filtros por estado y fecha.
- `GET /api/orders/:id` — Detalle completo e historial de trazabilidad.
- `PATCH /api/orders/:id/status` — Transición validada por máquina de estados.
- `POST /api/orders/:id/cancel` — Cancelación según reglas de negocio.

### Reportes
- `GET /api/reports/summary` — Métricas del día (ventas, promedio de preparación, pedidos).
- `GET /api/reports/top-products` — Ranking de platos más vendidos.
- `GET /api/reports/sales` — Agrupación de ingresos por día/semana/mes.

---

## 7. Eventos en Tiempo Real (Socket.IO)

- `order:created` — Notifica a cocina y atención la llegada de una nueva orden.
- `order:statusChanged` — Emite cambios de estado a la sala privada del pedido `order:<orderId>`.
- `notification:created` — Envío de alerta al cliente en su canal personal `user:<userId>`.

---

## 8. Evidencias de Pruebas Automatizadas

El backend incluye suite de pruebas unitarias y de integración con **Jest** y **Supertest**:
- Verificación de hash seguro y tokens expirados.
- Validación de que un cliente no puede alterar los precios reales del menú.
- Control de acceso a pedidos ajenos (RBAC).
- Máquina de estados: rechazo de saltos inválidos (ej. `PREPARANDO` a `ENTREGADO`).
- Preservación íntegra de la tabla `order_status_history`.

Ejecutar pruebas:
```bash
cd services/orders-service
npm test
```
