# DOCUMENTACIÓN ACADÉMICA DEL PROYECTO ORDERTRACK
## Plataforma Web Distribuida para la Gestión y Seguimiento de Pedidos en Tiempo Real Mediante Angular y Servicios Independientes

**Asignatura:** Soluciones Web y Aplicaciones Distribuidas (VIII Ciclo)  
**Institución:** Universidad Privada del Norte (UPN), Perú  
**Proyecto:** OrderTrack  

---

## 1. DESCRIPCIÓN DEL PROBLEMA

En el sector gastronómico de medianas y pequeñas empresas (restaurantes de comida rápida, pollerías y restaurantes criollos tradicionales), el ciclo de vida del pedido sufre de una desconexión crítica entre sus tres actores principales:
1. **Atención al Cliente / Canales Digitales:** Registran el pedido con especificaciones o preferencias del cliente.
2. **Línea de Producción (Cocina / Barra):** Reciben órdenes sin orden de prioridad claro o con tiempos de cocción no cronometrados.
3. **El Consumidor / Cliente:** Carece de visibilidad sobre el estado de su orden, generando incertidumbre y saturación del canal de atención al preguntar repetitivamente por su comanda.

Este problema genera:
- Tiempos muertos y cuellos de botella en la entrega de platos.
- Errores en la entrega de productos o cancelación tardía de comandas.
- Ausencia de métricas históricas de preparación para la toma de decisiones gerenciales.

---

## 2. JUSTIFICACIÓN

La implementación de una plataforma web distribuida desacopla los módulos de negocio permitiendo que la cocina trabaje sobre una interfaz operativa táctil en tiempo real (Kanban), mientras que la API transaccional procesa cobros y validaciones con rigurosidad bancaria/monetaria (tipos numéricos precisos, transacciones atómicas). El uso de WebSockets (Socket.IO) reduce el tráfico innecesario en la red en comparación con el *polling* continuo HTTP y garantiza una experiencia de usuario fluida e instantánea.

---

## 3. OBJETIVOS DEL PROYECTO

### 3.1. Objetivo General
Desarrollar una plataforma web distribuida funcional para la gestión y seguimiento en tiempo real de pedidos gastronómicos, integrando una arquitectura basada en microservicios Node.js/Express, persistencia transaccional en PostgreSQL y una interfaz de usuario reactiva en Angular.

### 3.2. Objetivos Específicos
1. Implementar una máquina de estados determinista en el backend para regular las transiciones permitidas del pedido (`RECIBIDO` → `CONFIRMADO` → `PREPARANDO` → `LISTO` → `ENTREGADO`/`EN_CAMINO`).
2. Diseñar un servicio de tiempo real (Socket.IO) desacoplado que difunda los eventos operativos a salas autorizadas (`kitchen`, `atencion`, `order:<id>`).
3. Construir una interfaz SPA en Angular con componentes Standalone y Reactive Forms, adaptativa para desktop, tablet y dispositivos móviles.
4. Generar un tablero Kanban operativo para el personal de cocina con alertas visuales de pedidos demorados (> 25 minutos).
5. Proveer trazabilidad de cada cambio de estado conservando el usuario responsable, timestamp e indicaciones en la base de datos PostgreSQL.

---

## 4. ALCANCE Y REQUISITOS

### 4.1. Requisitos Funcionales (RF)
- **RF-01 (Autenticación y Roles):** Inicio de sesión con JWT y control de acceso basado en roles (`ADMIN`, `ATENCION`, `COCINA`, `CLIENTE`).
- **RF-02 (Catálogo Digital):** Visualización de carta con búsqueda, categorías y precios en Soles peruanos (S/.).
- **RF-03 (Gestión de Carrito y Validación de Precios):** Registro del pedido en el cliente con recálculo mandatorio de precios y disponibilidad en el servidor.
- **RF-04 (Máquina de Estados de Pedidos):** Validación estricta que impide saltos de estado incongruentes.
- **RF-05 (Seguimiento en Vivo):** Stepper visual para el cliente con reconexión automática vía WebSockets.
- **RF-06 (Tablero de Cocina):** Vista Kanban de 4 columnas que actualiza automáticamente los pedidos sin recargar el navegador.
- **RF-07 (Dashboard y Reportes):** Estadísticas de ventas, productos más vendidos y tiempos promedio de cocción en base a datos reales.

### 4.2. Requisitos No Funcionales (RNF)
- **RNF-01 (Seguridad):** Contraseñas encriptadas con bcrypt (`saltRounds=10`), validación estricta de payloads con `express-validator`, tokens firmados y sin exposición de hashes.
- **RNF-02 (Integridad Monetaria):** Empleo de tipo `Decimal` (PostgreSQL `NUMERIC(10,2)`) evitando imprecisiones de coma flotante.
- **RNF-03 (Escalabilidad y Desacoplamiento):** Servicios independientes con Docker Compose y preparación de arquitectura dirigida por eventos con RabbitMQ y Outbox Pattern.

---

## 5. ARQUITECTURA DE COMPONENTES Y DESPLIEGUE

### 5.1. Diagrama de Componentes
```
+─────────────────────────────────────────────────────────────+
|                     CLIENTE / FRONTEND                      |
|  Angular 19 Standalone (SPA) en Nginx (Puerto 4200 / 80)     |
|   - Menú Digital & Carrito      - Tablero Kanban Cocina     |
|   - Seguimiento en Vivo         - Dashboard & Reportes      |
+──────────────────────────┬──────────────────────────────────+
                           │
             HTTP / REST   │   WebSockets (Socket.IO)
                           ▼
+──────────────────────────┴──────────────────────────────────+
|                    CAPA DE SERVICIOS                        |
|                                                             |
|  +─────────────────────────+     +───────────────────────+  |
|  |     orders-service      |     |   realtime-service    |  |
|  |     (Express / API)     |     |  (Socket.IO Server)   |  |
|  |       Puerto 3001       |     |      Puerto 3002      |  |
|  +────────────┬────────────+     +───────────▲───────────+  |
|               │                              │              |
|               │ (Outbox / Eventos)           │              |
|               ▼                              │              |
|       +──────────────────────────────────────┴───+          |
|       |         RabbitMQ Message Broker          |          |
|       |         (Puerto 5672 / 15672)            |          |
|       +──────────────────────────────────────────+          |
|                                                             |
|               │ Consultas SQL Transaccionales               |
|               ▼                                             |
|  +───────────────────────────────────────────────────────+  |
|  |                 PostgreSQL 16                         |  |
|  |       (Esquema Relacional / Prisma ORM)               |  |
|  +───────────────────────────────────────────────────────+  |
+─────────────────────────────────────────────────────────────+
```

---

## 6. MODELO ENTIDAD-RELACIÓN (POSTGRESQL)

```
  +------------------+         +--------------------+
  |      users       |         |     categories     |
  +------------------+         +--------------------+
  | id (PK, UUID)    |         | id (PK, UUID)      |
  | email (UNIQUE)   |         | name (VARCHAR)     |
  | password_hash    |         | sort_order (INT)   |
  | role (ENUM)      |         +---------┬----------+
  | active (BOOLEAN) |                   | 1:N
  +--------┬---------+                   ▼
           | 1:N               +--------------------+
           |                   |      products      |
           ▼                   +--------------------+
  +------------------+         | id (PK, UUID)      |
  |      orders      |         | category_id (FK)   |
  +------------------+         | name (VARCHAR)     |
  | id (PK, UUID)    |<----+   | price (DECIMAL)    |
  | order_code (UNIQ)|     |   | available (BOOL)   |
  | customer_id (FK) |     |   +---------┬----------+
  | delivery_type    |     |             | 1:N
  | status (ENUM)    |     | 1:N         ▼
  | total (DECIMAL)  |     |   +--------------------+
  +--------┬---------+     +---|    order_items     |
           |                   +--------------------+
           | 1:N               | id (PK, UUID)      |
           ▼                   | order_id (FK)      |
  +--------------------+       | product_id (FK)    |
  |order_status_history|       | quantity (INT)     |
  +--------------------+       | unit_price (DECIMAL|
  | id (PK, UUID)      |       | line_total (DECIMAL|
  | order_id (FK)      |       +--------------------+
  | previous_status    |
  | new_status         |
  | changed_by (FK)    |
  | changed_at (DATE)  |
  +--------------------+
```

---

## 7. DIAGRAMA DE SECUENCIA: CREACIÓN Y SEGUIMIENTO EN TIEMPO REAL

```
Cliente (Angular)        Orders Service            PostgreSQL         RabbitMQ / Socket.IO        Cocina (Angular)
       │                       │                       │                       │                       │
       │── POST /api/orders ──>│                       │                       │                       │
       │                       │── Iniciar Transacción>│                       │                       │
       │                       │   (Valida stock & $)  │                       │                       │
       │                       │   (Inserta Order,     │                       │                       │
       │                       │    Items & Historial) │                       │                       │
       │                       │── Commit Transacción ─>│                       │                       │
       │                       │                                               │                       │
       │                       │── Publica 'PedidoCreado' ────────────────────>│                       │
       │                       │                                               │── Evento 'order:created' ───>│
       │<── 201 Created (ORD) ─│                                               │                       │  (Aparece tarjeta
       │                                                                       │                       │   en Kanban)
       │── Suscribir a sala 'order:ORD' ──────────────────────────────────────>│                       │
       │                                                                       │                       │
       │                       │                       │                       │<── PATCH status ──────│
       │                       │<── PATCH /api/orders/:id/status ──────────────┼─── 'PREPARANDO' ──────│
       │                       │── UPDATE orders & INSERT order_status_history>│                       │
       │                       │── Publica 'PedidoEnPreparacion' ─────────────>│                       │
       │                       │                                               │                       │
       │<── Evento 'order:statusChanged' ──────────────────────────────────────│                       │
   (Avanza Stepper en vivo)
```

---

## 8. ESTRATEGIA DE PRUEBAS

Se han formulado pruebas automatizadas organizadas en:
1. **Pruebas Unitarias de Reglas de Negocio:**
   - La función `validateTransition` valida que transiciones ilegales (ej. `RECIBIDO` a `ENTREGADO`) arrojen error `422 Unprocessable Entity`.
   - La función `validateCancellation` impide cancelar pedidos en estado `PREPARANDO` o superior.
2. **Pruebas de Integración con Supertest:**
   - Endpoints de autenticación: rechazo de contraseñas incorrectas o correos inexistentes.
   - Cálculo de totales: verificación de que si el cliente envía una cantidad, el servidor multiplica por el precio guardado en la BD y no por un valor adulterado por el cliente.
   - Aislamiento multi-inquilino de clientes: un usuario con rol `CLIENTE` no puede consultar ni cancelar pedidos pertenecientes a otro usuario (`403 Forbidden`).

---

## 9. LIMITACIONES CONOCIDAS Y MEJORAS FUTURAS

1. **Pasarelas de Pago:** Actualmente el sistema calcula y asienta pedidos con pago en efectivo/contraentrega. Como mejora futura, se puede integrar la pasarela de pagos Niubiz / Culqi / Yape QR.
2. **Geolocalización GPS:** El estado `EN_CAMINO` notifica el despacho pero no cuenta aún con rastreo por GPS de motorizados sobre Google Maps.
3. **Impresión de Comandas Térmicas:** Integración con impresoras ESC/POS mediante agentes de impresión local por USB/Red.

