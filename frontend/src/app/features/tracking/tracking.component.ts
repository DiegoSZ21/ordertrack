import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { OrdersService } from '../../core/services/orders.service';
import { SocketService } from '../../core/services/socket.service';
import { Order, OrderStatus, ORDER_STATUS_LABELS } from '../../core/models/order.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="tracking-page">
      <div class="tracking-header">
        <div class="tracking-header__inner">
          <a routerLink="/menu" class="btn btn--secondary btn--sm">
            <span class="material-icons-round">arrow_back</span>
            Ir a la carta
          </a>
          <div class="tracking-header__title">
            <h2>Seguimiento de Pedido</h2>
            <span class="order-badge">{{ order()?.orderCode }}</span>
          </div>
          <!-- Estado de conexión Socket -->
          <div class="socket-pill" [class.socket-pill--connected]="socketConnected()">
            <span class="socket-dot"></span>
            <span>{{ socketConnected() ? 'En vivo' : 'Reconectando...' }}</span>
          </div>
        </div>
      </div>

      <div class="tracking-body">
        @if (errorMessage()) {
          <div class="alert alert--error" style="margin-bottom: 1.5rem;">
            <span class="material-icons-round">error</span>
            {{ errorMessage() }}
          </div>
        }

        @if (loading() && !order()) {
          <div class="card skeleton" style="height: 380px;"></div>
        } @else if (order()) {
          <!-- Mensaje especial si está cancelado -->
          @if (order()!.status === 'CANCELADO') {
            <div class="alert alert--error" style="margin-bottom: 2rem; padding: 1.5rem;">
              <span class="material-icons-round" style="font-size: 2.5rem;">cancel</span>
              <div>
                <h3 style="margin: 0; color: #991B1B;">Tu pedido fue cancelado</h3>
                <p style="margin: 0.25rem 0 0; color: #B91C1C;">
                  Motivo: {{ getCancellationReason() }}
                </p>
              </div>
            </div>
          } @else {
            <!-- Stepper / Línea de progreso visual -->
            <div class="card stepper-card">
              <div class="stepper">
                @for (step of steps; track step.index; let i = $index) {
                  <div
                    class="step-item"
                    [class.step-item--completed]="currentStepIndex() > i"
                    [class.step-item--active]="currentStepIndex() === i"
                  >
                    <div class="step-circle">
                      @if (currentStepIndex() > i) {
                        <span class="material-icons-round">done</span>
                      } @else {
                        <span>{{ i + 1 }}</span>
                      }
                    </div>
                    <div class="step-label">
                      <span class="step-title">{{ step.label }}</span>
                      <span class="step-sub">{{ step.desc }}</span>
                    </div>
                    @if (i < steps.length - 1) {
                      <div class="step-connector"></div>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- Grid de Detalles del Pedido y Resumen -->
          <div class="details-grid">
            <!-- Productos Solicitados -->
            <div class="card">
              <div class="card__header">
                <h3 style="font-size: 1.1rem; margin: 0;">Platos solicitados</h3>
                <span class="status-badge status-badge--{{ order()!.status }}">
                  {{ getStatusLabel(order()!.status) }}
                </span>
              </div>
              <div class="card__body" style="padding: 0;">
                <div class="items-list">
                  @for (item of order()!.items; track item.id) {
                    <div class="item-card">
                      <div class="item-qty">{{ item.quantity }}x</div>
                      <div class="item-info">
                        <span class="item-title">{{ item.productNameSnapshot }}</span>
                        <span class="item-sub">S/ {{ item.unitPrice }} c/u</span>
                      </div>
                      <div class="item-price">
                        S/ {{ item.lineTotal }}
                      </div>
                    </div>
                  }
                </div>
              </div>
              <div class="card__footer" style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; font-size: 1.1rem;">Total cancelado:</span>
                <span style="font-size: 1.5rem; font-weight: 800; color: var(--color-primary);">
                  S/ {{ order()!.total }}
                </span>
              </div>
            </div>

            <!-- Trazabilidad en tiempo real -->
            <div class="card">
              <div class="card__header">
                <h3 style="font-size: 1.1rem; margin: 0;">Línea de tiempo de eventos</h3>
              </div>
              <div class="card__body">
                <div class="timeline">
                  @for (h of order()!.statusHistory ?? []; track h.id) {
                    <div class="timeline-row">
                      <div class="timeline-marker"></div>
                      <div class="timeline-detail">
                        <div class="timeline-status-badge">
                          <span class="status-badge status-badge--{{ h.newStatus }}">
                            {{ getStatusLabel(h.newStatus) }}
                          </span>
                          <span class="timeline-time">{{ h.changedAt | date:'HH:mm:ss' }}</span>
                        </div>
                        <p class="timeline-msg">
                          {{ getStatusDescription(h.newStatus) }}
                        </p>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .tracking-page {
      min-height: 100vh;
      background: var(--color-bg);
      display: flex;
      flex-direction: column;
    }

    .tracking-header {
      background: white;
      border-bottom: 1px solid var(--color-border);
      padding: 1rem 1.5rem;

      &__inner {
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
      }

      &__title {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        h2 { margin: 0; font-size: 1.25rem; font-weight: 700; }
      }
    }

    .order-badge {
      background: var(--color-primary-50);
      color: var(--color-primary);
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      font-weight: 800;
      font-size: 0.9rem;
    }

    .socket-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.75rem;
      border-radius: 9999px;
      background: #FEE2E2;
      color: #991B1B;
      font-size: 0.75rem;
      font-weight: 600;

      .socket-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #DC2626;
      }

      &--connected {
        background: #DCFCE7;
        color: #166534;
        .socket-dot { background: #16A34A; }
      }
    }

    .tracking-body {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      width: 100%;
    }

    .stepper-card {
      margin-bottom: 2rem;
      padding: 2rem 1.5rem;
      overflow-x: auto;
    }

    .stepper {
      display: flex;
      justify-content: space-between;
      min-width: 600px;
      position: relative;
    }

    .step-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      position: relative;
      flex: 1;

      &--completed {
        .step-circle {
          background: var(--color-success);
          color: white;
          border-color: var(--color-success);
        }
        .step-title { color: var(--color-text); font-weight: 600; }
        .step-connector { background: var(--color-success); }
      }

      &--active {
        .step-circle {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px var(--color-primary-light);
        }
        .step-title { color: var(--color-primary); font-weight: 700; }
      }
    }

    .step-circle {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: white;
      border: 2px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--color-text-secondary);
      z-index: 2;
      transition: all var(--transition-base);
    }

    .step-label {
      margin-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .step-title {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
    }

    .step-sub {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .step-connector {
      position: absolute;
      top: 19px;
      left: 50%;
      right: -50%;
      height: 3px;
      background: var(--color-border);
      z-index: 1;
      transition: background var(--transition-base);
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .items-list {
      display: flex;
      flex-direction: column;
    }

    .item-card {
      display: flex;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--color-border-light);
      gap: 1rem;

      &:last-child { border-bottom: none; }
    }

    .item-qty {
      font-weight: 800;
      color: var(--color-primary);
      font-size: 1.1rem;
    }

    .item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .item-title {
      font-weight: 600;
      color: var(--color-text);
      font-size: 0.95rem;
    }

    .item-sub {
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    .item-price {
      font-weight: 700;
      font-size: 1rem;
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      position: relative;
      padding-left: 1.25rem;

      &::before {
        content: '';
        position: absolute;
        left: 5px;
        top: 6px;
        bottom: 6px;
        width: 2px;
        background: var(--color-border);
      }
    }

    .timeline-row {
      position: relative;
    }

    .timeline-marker {
      position: absolute;
      left: -1.25rem;
      top: 5px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--color-primary);
      border: 2px solid white;
      box-shadow: 0 0 0 1px var(--color-border);
    }

    .timeline-detail {
      background: var(--color-bg);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
    }

    .timeline-status-badge {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .timeline-time {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .timeline-msg {
      margin: 0.35rem 0 0;
      font-size: 0.85rem;
      color: var(--color-text-secondary);
    }
  `]
})
export class TrackingComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(OrdersService);
  private readonly socketService = inject(SocketService);
  private readonly destroy$ = new Subject<void>();

  readonly order = signal<Order | null>(null);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly socketConnected = signal<boolean>(false);

  readonly steps = [
    { index: 0, status: 'RECIBIDO', label: 'Recibido', desc: 'Registrado en el sistema' },
    { index: 1, status: 'CONFIRMADO', label: 'Confirmado', desc: 'Aceptado por atención' },
    { index: 2, status: 'PREPARANDO', label: 'En Preparación', desc: 'Cocinándose al momento' },
    { index: 3, status: 'LISTO', label: 'Listo / En Camino', desc: 'Empacado para despacho' },
    { index: 4, status: 'ENTREGADO', label: 'Entregado', desc: '¡Buen provecho!' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadOrder(id);
      this.socketService.connect();
      this.socketService.subscribeToOrder(id);

      this.socketService.connectionStatus$
        .pipe(takeUntil(this.destroy$))
        .subscribe((connected) => {
          this.socketConnected.set(connected);
          if (connected) {
            this.loadOrder(id); // Recargar al reconectar
          }
        });

      this.socketConnected.set(this.socketService.isConnected);

      this.socketService.onOrderStatusChanged()
        .pipe(takeUntil(this.destroy$))
        .subscribe((data) => {
          if (data.orderId === id) {
            this.loadOrder(id);
          }
        });
    }
  }

  ngOnDestroy(): void {
    const id = this.order()?.id;
    if (id) {
      this.socketService.unsubscribeFromOrder(id);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrder(id: string): void {
    this.loading.set(true);
    this.ordersService.getOrderById(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.order.set(res.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'No se pudo cargar la orden');
      }
    });
  }

  currentStepIndex(): number {
    const status = this.order()?.status;
    switch (status) {
      case 'RECIBIDO': return 0;
      case 'CONFIRMADO': return 1;
      case 'PREPARANDO': return 2;
      case 'LISTO':
      case 'EN_CAMINO': return 3;
      case 'ENTREGADO': return 4;
      default: return -1;
    }
  }

  getStatusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status] ?? status;
  }

  getStatusDescription(status: OrderStatus): string {
    const map: Record<string, string> = {
      RECIBIDO: 'Tu orden fue ingresada al restaurante.',
      CONFIRMADO: 'Atención al cliente verificó y confirmó tu orden.',
      PREPARANDO: 'El chef y equipo de cocina están preparando tus platos.',
      LISTO: 'Tu pedido está listo y empacado para recoger.',
      EN_CAMINO: 'El motorizado de delivery va en camino a tu dirección.',
      ENTREGADO: '¡El pedido fue entregado con éxito!',
      CANCELADO: 'El pedido fue cancelado.',
    };
    return map[status] ?? 'Actualización del estado del pedido.';
  }

  getCancellationReason(): string {
    const history = this.order()?.statusHistory;
    if (history && history.length > 0) {
      const cancelRecord = history.find((h) => h.newStatus === 'CANCELADO');
      if (cancelRecord?.notes) return cancelRecord.notes;
    }
    return this.order()?.notes ?? 'Cancelado por el personal del restaurante.';
  }
}
