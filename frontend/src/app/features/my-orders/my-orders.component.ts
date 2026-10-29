import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrdersService } from '../../core/services/orders.service';
import { Order, OrderStatus, ORDER_STATUS_LABELS } from '../../core/models/order.model';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="my-orders-page">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Mis Pedidos</h1>
          <p class="page-header__subtitle">Consulta el historial y seguimiento en vivo de tus órdenes</p>
        </div>
        <a routerLink="/menu" class="btn btn--primary">
          <span class="material-icons-round">restaurant_menu</span>
          Ver Menú y Pedir
        </a>
      </div>

      @if (errorMessage()) {
        <div class="alert alert--error" style="margin-bottom: 1.5rem;">
          <span class="material-icons-round">error</span>
          {{ errorMessage() }}
        </div>
      }

      @if (loading()) {
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="card skeleton" style="height: 120px;"></div>
          <div class="card skeleton" style="height: 120px;"></div>
        </div>
      } @else if (orders().length === 0) {
        <div class="empty-state">
          <span class="material-icons-round">receipt_long</span>
          <h3>Aún no has realizado pedidos</h3>
          <p>Explora nuestra carta digital y pide los mejores platos peruanos en línea.</p>
          <a routerLink="/menu" class="btn btn--primary" style="margin-top: 1rem;">Ir al Menú</a>
        </div>
      } @else {
        <div class="orders-grid">
          @for (order of orders(); track order.id) {
            <div class="card order-card">
              <div class="card__header" style="padding: 1rem 1.25rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span style="font-weight: 800; font-size: 1.1rem; color: var(--color-primary);">
                    {{ order.orderCode }}
                  </span>
                  <span class="status-badge status-badge--{{ order.status }}">
                    {{ getStatusLabel(order.status) }}
                  </span>
                </div>
                <span style="font-size: 0.8rem; color: var(--color-text-secondary);">
                  {{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}
                </span>
              </div>

              <div class="card__body" style="padding: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                  <div>
                    <span style="font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase;">Modalidad</span>
                    <div style="font-weight: 600; font-size: 0.9rem;">
                      {{ order.deliveryType === 'DELIVERY' ? 'Envío a domicilio' : 'Recojo en restaurante' }}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <span style="font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase;">Monto total</span>
                    <div style="font-size: 1.35rem; font-weight: 800; color: var(--color-text);">
                      S/ {{ order.total }}
                    </div>
                  </div>
                </div>

                <div style="font-size: 0.85rem; color: var(--color-text-secondary); border-top: 1px dashed var(--color-border); padding-top: 0.75rem;">
                  <strong>Platos:</strong>
                  @for (item of order.items; track item.id; let last = $last) {
                    <span> {{ item.quantity }}x {{ item.productNameSnapshot }}{{ !last ? ',' : '' }}</span>
                  }
                </div>
              </div>

              <div class="card__footer" style="padding: 0.75rem 1.25rem; display: flex; justify-content: space-between; align-items: center;">
                <a [routerLink]="['/seguimiento', order.id]" class="btn btn--primary btn--sm">
                  <span class="material-icons-round" style="font-size: 16px;">radar</span>
                  Ver Seguimiento en Vivo
                </a>

                @if (order.status === 'RECIBIDO') {
                  <button class="btn btn--ghost btn--sm" style="color: var(--color-error);" (click)="cancelOrder(order)">
                    Cancelar pedido
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .my-orders-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .orders-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .order-card {
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);
      &:hover {
        box-shadow: var(--shadow-md);
      }
    }
  `]
})
export class MyOrdersComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.ordersService.getOrders({ limit: 50 }).subscribe({
      next: (res) => {
        if (res.success) {
          this.orders.set(res.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Error al cargar tus pedidos');
      }
    });
  }

  cancelOrder(order: Order): void {
    if (!confirm(`¿Estás seguro de cancelar tu pedido ${order.orderCode}?`)) return;

    this.ordersService.cancelOrder(order.id, 'Cancelado por el cliente').subscribe({
      next: () => {
        this.loadOrders();
      },
      error: (err) => {
        alert(err?.error?.message ?? 'No se pudo cancelar el pedido');
      }
    });
  }

  getStatusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status] ?? status;
  }
}

