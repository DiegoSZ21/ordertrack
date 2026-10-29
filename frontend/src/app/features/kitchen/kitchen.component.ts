import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrdersService } from '../../core/services/orders.service';
import { SocketService } from '../../core/services/socket.service';
import { Order, OrderStatus } from '../../core/models/order.model';
import { Subject, interval, takeUntil } from 'rxjs';

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kitchen-view">
      <div class="page-header">
        <div>
          <h1 class="page-header__title" style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="material-icons-round" style="color: var(--color-warning);">soup_kitchen</span>
            Tablero de Producción de Cocina
          </h1>
          <p class="page-header__subtitle">Control de preparación en tiempo real y flujo Kanban</p>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <span class="status-badge status-badge--CONFIRMADO">
            Auto-sincronizado vía WebSockets
          </span>
          <button class="btn btn--secondary btn--sm" (click)="loadOrders()" [disabled]="loading()">
            <span class="material-icons-round" [class.spinner]="loading()">refresh</span>
            Refrescar
          </button>
        </div>
      </div>

      @if (errorMessage()) {
        <div class="alert alert--error" style="margin-bottom: 1rem;">
          <span class="material-icons-round">error</span>
          {{ errorMessage() }}
        </div>
      }

      <!-- Tablero Kanban -->
      <div class="kanban-board">
        <!-- Columna 1: RECIBIDO -->
        <div class="kanban-column">
          <div class="kanban-column__header" style="border-top: 4px solid var(--color-status-recibido);">
            <div class="kanban-column__title">
              <span>Recibidos</span>
              <span class="kanban-column__count">{{ getOrdersByStatus('RECIBIDO').length }}</span>
            </div>
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">Pendientes de confirmación</span>
          </div>
          <div class="kanban-column__body">
            @for (order of getOrdersByStatus('RECIBIDO'); track order.id) {
              <div class="order-card" [class.order-card--delayed]="isDelayed(order.createdAt)">
                <div class="order-card__header">
                  <span class="order-card__code">{{ order.orderCode }}</span>
                  <span class="order-card__time" [title]="order.createdAt">
                    <span class="material-icons-round" style="font-size: 14px;">schedule</span>
                    {{ getElapsedTime(order.createdAt) }}
                  </span>
                </div>
                <div class="order-card__delivery">
                  <span class="material-icons-round" style="font-size: 16px;">
                    {{ order.deliveryType === 'DELIVERY' ? 'two_wheeler' : 'shopping_bag' }}
                  </span>
                  <span>{{ order.deliveryType }}</span>
                </div>
                <div class="order-card__items">
                  @for (item of order.items; track item.id) {
                    <div class="order-item-row">
                      <span class="item-qty">{{ item.quantity }}x</span>
                      <span class="item-name">{{ item.productNameSnapshot }}</span>
                    </div>
                  }
                </div>
                @if (order.notes) {
                  <div class="order-card__notes">
                    <span class="material-icons-round" style="font-size: 14px;">chat</span>
                    <span>{{ order.notes }}</span>
                  </div>
                }
                <div class="order-card__actions">
                  <button class="btn btn--primary btn--sm btn--full" (click)="advanceStatus(order, 'CONFIRMADO')">
                    Confirmar pedido
                    <span class="material-icons-round" style="font-size: 16px;">arrow_forward</span>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Columna 2: CONFIRMADO -->
        <div class="kanban-column">
          <div class="kanban-column__header" style="border-top: 4px solid var(--color-status-confirmado);">
            <div class="kanban-column__title">
              <span>Confirmados</span>
              <span class="kanban-column__count">{{ getOrdersByStatus('CONFIRMADO').length }}</span>
            </div>
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">Listos para iniciar cocción</span>
          </div>
          <div class="kanban-column__body">
            @for (order of getOrdersByStatus('CONFIRMADO'); track order.id) {
              <div class="order-card" [class.order-card--delayed]="isDelayed(order.createdAt)">
                <div class="order-card__header">
                  <span class="order-card__code">{{ order.orderCode }}</span>
                  <span class="order-card__time">
                    <span class="material-icons-round" style="font-size: 14px;">schedule</span>
                    {{ getElapsedTime(order.createdAt) }}
                  </span>
                </div>
                <div class="order-card__delivery">
                  <span class="material-icons-round" style="font-size: 16px;">
                    {{ order.deliveryType === 'DELIVERY' ? 'two_wheeler' : 'shopping_bag' }}
                  </span>
                  <span>{{ order.deliveryType }}</span>
                </div>
                <div class="order-card__items">
                  @for (item of order.items; track item.id) {
                    <div class="order-item-row">
                      <span class="item-qty">{{ item.quantity }}x</span>
                      <span class="item-name">{{ item.productNameSnapshot }}</span>
                    </div>
                  }
                </div>
                @if (order.notes) {
                  <div class="order-card__notes">
                    <span class="material-icons-round" style="font-size: 14px;">chat</span>
                    <span>{{ order.notes }}</span>
                  </div>
                }
                <div class="order-card__actions">
                  <button class="btn btn--warning btn--sm btn--full" (click)="advanceStatus(order, 'PREPARANDO')">
                    Iniciar Preparación
                    <span class="material-icons-round" style="font-size: 16px;">restaurant</span>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Columna 3: PREPARANDO -->
        <div class="kanban-column">
          <div class="kanban-column__header" style="border-top: 4px solid var(--color-status-preparando);">
            <div class="kanban-column__title">
              <span>En Preparación</span>
              <span class="kanban-column__count">{{ getOrdersByStatus('PREPARANDO').length }}</span>
            </div>
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">En los fogones / barra</span>
          </div>
          <div class="kanban-column__body">
            @for (order of getOrdersByStatus('PREPARANDO'); track order.id) {
              <div class="order-card order-card--cooking" [class.order-card--delayed]="isDelayed(order.createdAt)">
                <div class="order-card__header">
                  <span class="order-card__code">{{ order.orderCode }}</span>
                  <span class="order-card__time" [class.text-danger]="isDelayed(order.createdAt)">
                    <span class="material-icons-round" style="font-size: 14px;">timer</span>
                    {{ getElapsedTime(order.createdAt) }}
                  </span>
                </div>
                <div class="order-card__delivery">
                  <span class="material-icons-round" style="font-size: 16px;">
                    {{ order.deliveryType === 'DELIVERY' ? 'two_wheeler' : 'shopping_bag' }}
                  </span>
                  <span>{{ order.deliveryType }}</span>
                </div>
                <div class="order-card__items">
                  @for (item of order.items; track item.id) {
                    <div class="order-item-row">
                      <span class="item-qty">{{ item.quantity }}x</span>
                      <span class="item-name">{{ item.productNameSnapshot }}</span>
                    </div>
                  }
                </div>
                @if (order.notes) {
                  <div class="order-card__notes">
                    <span class="material-icons-round" style="font-size: 14px;">chat</span>
                    <span>{{ order.notes }}</span>
                  </div>
                }
                <div class="order-card__actions">
                  <button class="btn btn--success btn--sm btn--full" (click)="advanceStatus(order, 'LISTO')">
                    Marcar como Listo
                    <span class="material-icons-round" style="font-size: 16px;">done_all</span>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Columna 4: LISTO -->
        <div class="kanban-column">
          <div class="kanban-column__header" style="border-top: 4px solid var(--color-status-listo);">
            <div class="kanban-column__title">
              <span>Listos para Entrega</span>
              <span class="kanban-column__count">{{ getOrdersByStatus('LISTO').length }}</span>
            </div>
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">Mesa de despacho</span>
          </div>
          <div class="kanban-column__body">
            @for (order of getOrdersByStatus('LISTO'); track order.id) {
              <div class="order-card">
                <div class="order-card__header">
                  <span class="order-card__code">{{ order.orderCode }}</span>
                  <span class="order-card__time">
                    <span class="material-icons-round" style="font-size: 14px;">check_circle</span>
                    Listo
                  </span>
                </div>
                <div class="order-card__delivery">
                  <span class="material-icons-round" style="font-size: 16px;">
                    {{ order.deliveryType === 'DELIVERY' ? 'two_wheeler' : 'shopping_bag' }}
                  </span>
                  <span>{{ order.deliveryType }}</span>
                </div>
                <div class="order-card__items">
                  @for (item of order.items; track item.id) {
                    <div class="order-item-row">
                      <span class="item-qty">{{ item.quantity }}x</span>
                      <span class="item-name">{{ item.productNameSnapshot }}</span>
                    </div>
                  }
                </div>
                <div class="order-card__actions">
                  @if (order.deliveryType === 'DELIVERY') {
                    <button class="btn btn--primary btn--sm btn--full" (click)="advanceStatus(order, 'EN_CAMINO')">
                      Despachar Delivery
                      <span class="material-icons-round" style="font-size: 16px;">local_shipping</span>
                    </button>
                  } @else {
                    <button class="btn btn--success btn--sm btn--full" (click)="advanceStatus(order, 'ENTREGADO')">
                      Entregar al Cliente
                      <span class="material-icons-round" style="font-size: 16px;">done</span>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kitchen-view {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .kanban-board {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      min-height: 70vh;
      align-items: flex-start;

      @media (max-width: 1200px) {
        grid-template-columns: repeat(2, 1fr);
      }
      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }
    }

    .kanban-column {
      background: #F1F5F9;
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 180px);

      &__header {
        padding: 1rem;
        background: white;
        border-bottom: 1px solid var(--color-border);
        border-top-left-radius: var(--radius-lg);
        border-top-right-radius: var(--radius-lg);
      }

      &__title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 700;
        font-size: 1rem;
        color: var(--color-text);
        margin-bottom: 0.25rem;
      }

      &__count {
        background: var(--color-primary-50);
        color: var(--color-primary);
        font-size: 0.75rem;
        padding: 0.15rem 0.5rem;
        border-radius: 9999px;
        font-weight: 700;
      }

      &__body {
        padding: 0.75rem;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        flex: 1;
      }
    }

    .order-card {
      background: white;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 0.875rem;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);

      &:hover {
        box-shadow: var(--shadow-md);
      }

      &--cooking {
        border-left: 4px solid var(--color-warning);
      }

      &--delayed {
        border-left: 4px solid var(--color-error);
        background-color: #FFFDFD;
      }

      &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      &__code {
        font-size: 1rem;
        font-weight: 700;
        color: var(--color-text);
      }

      &__time {
        font-size: 0.75rem;
        color: var(--color-text-secondary);
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      &__delivery {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-text-secondary);
        background: var(--color-bg);
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        width: fit-content;
      }

      &__items {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.85rem;
        border-top: 1px dashed var(--color-border-light);
        padding-top: 0.5rem;
      }

      &__notes {
        display: flex;
        align-items: flex-start;
        gap: 0.35rem;
        font-size: 0.75rem;
        color: #92400E;
        background: #FEF3C7;
        padding: 0.4rem 0.6rem;
        border-radius: 4px;
        font-weight: 500;
      }

      &__actions {
        margin-top: 0.25rem;
      }
    }

    .order-item-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .item-qty {
        font-weight: 700;
        color: var(--color-primary);
        min-width: 24px;
      }

      .item-name {
        color: var(--color-text);
        font-weight: 500;
      }
    }

    .text-danger {
      color: var(--color-error) !important;
      font-weight: 700;
    }
  `]
})
export class KitchenComponent implements OnInit, OnDestroy {
  private readonly ordersService = inject(OrdersService);
  private readonly socketService = inject(SocketService);
  private readonly destroy$ = new Subject<void>();

  readonly orders = signal<Order[]>([]);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly now = signal<number>(Date.now());

  ngOnInit(): void {
    this.loadOrders();

    // Actualizar cada minuto el tiempo transcurrido
    interval(60000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.now.set(Date.now());
    });

    // Escuchar sockets para nuevos pedidos o cambios de estado
    this.socketService.onOrderCreated()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadOrders();
      });

    this.socketService.onOrderStatusChanged()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadOrders();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.ordersService.getOrders({ limit: 100 }).subscribe({
      next: (res) => {
        if (res.success) {
          // Filtrar órdenes activas relevantes para cocina y despacho
          const active = res.data.filter((o) =>
            ['RECIBIDO', 'CONFIRMADO', 'PREPARANDO', 'LISTO'].includes(o.status)
          );
          this.orders.set(active);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Error al cargar órdenes de cocina');
      }
    });
  }

  getOrdersByStatus(status: OrderStatus): Order[] {
    return this.orders().filter((o) => o.status === status);
  }

  advanceStatus(order: Order, nextStatus: OrderStatus): void {
    this.ordersService.updateStatus(order.id, nextStatus).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadOrders();
        }
      },
      error: (err) => {
        alert(err?.error?.message ?? 'No se pudo actualizar el estado');
      }
    });
  }

  getElapsedTime(createdAt: string): string {
    const created = new Date(createdAt).getTime();
    const diffMs = this.now() - created;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Hace un momento';
    if (diffMins === 1) return 'Hace 1 min';
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  }

  isDelayed(createdAt: string): boolean {
    const created = new Date(createdAt).getTime();
    const diffMins = Math.floor((this.now() - created) / 60000);
    return diffMins > 25; // Alerta si supera 25 minutos
  }
}

