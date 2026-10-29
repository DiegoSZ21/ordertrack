import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrdersService } from '../../../core/services/orders.service';
import { AuthService } from '../../../core/services/auth.service';
import { SocketService } from '../../../core/services/socket.service';
import { Order, OrderStatus, ORDER_STATUS_LABELS } from '../../../core/models/order.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="order-detail-page">
      <!-- Encabezado con código y estado -->
      <div class="page-header">
        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <a routerLink="/panel/pedidos" class="btn btn--secondary btn--sm">
            <span class="material-icons-round">arrow_back</span>
            Volver
          </a>
          <div>
            <h1 class="page-header__title" style="display: flex; align-items: center; gap: 0.75rem;">
              Pedido {{ order()?.orderCode }}
              @if (order()) {
                <span class="status-badge status-badge--{{ order()!.status }}">
                  {{ getStatusLabel(order()!.status) }}
                </span>
              }
            </h1>
            <p class="page-header__subtitle">
              Creado el {{ order()?.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}
            </p>
          </div>
        </div>

        <!-- Acciones disponibles según rol y estado -->
        @if (order()) {
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            @for (next of order()!.availableTransitions ?? []; track next) {
              <button class="btn btn--primary" (click)="changeStatus(next)">
                Cambiar a {{ getStatusLabel(next) }}
              </button>
            }

            @if (order()!.canCancel) {
              <button class="btn btn--danger" (click)="openCancelModal()">
                Cancelar Pedido
              </button>
            }
          </div>
        }
      </div>

      @if (errorMessage()) {
        <div class="alert alert--error" style="margin-bottom: 1.5rem;">
          <span class="material-icons-round">error</span>
          {{ errorMessage() }}
        </div>
      }

      @if (loading() && !order()) {
        <div class="card skeleton" style="height: 350px;"></div>
      } @else if (order()) {
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
          <!-- Columna Izquierda: Detalles de Productos y Total -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            <!-- Productos -->
            <div class="card">
              <div class="card__header">
                <h3 style="font-size: 1.1rem;">Ítems del Pedido</h3>
              </div>
              <div class="table-wrapper">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style="text-align: center;">Cantidad</th>
                      <th style="text-align: right;">P. Unitario</th>
                      <th style="text-align: right;">Total Línea</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of order()!.items; track item.id) {
                      <tr>
                        <td>
                          <div style="font-weight: 600;">{{ item.productNameSnapshot }}</div>
                        </td>
                        <td style="text-align: center; font-weight: 700;">
                          {{ item.quantity }}
                        </td>
                        <td style="text-align: right;">
                          S/ {{ item.unitPrice }}
                        </td>
                        <td style="text-align: right; font-weight: 700;">
                          S/ {{ item.lineTotal }}
                        </td>
                      </tr>
                    }
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="3" style="text-align: right; font-weight: 600;">Subtotal:</td>
                      <td style="text-align: right; font-weight: 600;">S/ {{ order()!.subtotal }}</td>
                    </tr>
                    <tr style="font-size: 1.1rem; background-color: var(--color-primary-50);">
                      <td colspan="3" style="text-align: right; font-weight: 800; color: var(--color-primary);">Total a Pagar:</td>
                      <td style="text-align: right; font-weight: 800; color: var(--color-primary);">S/ {{ order()!.total }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- Observaciones -->
            @if (order()!.notes) {
              <div class="card">
                <div class="card__header">
                  <h3 style="font-size: 1.1rem;">Observaciones de Cocina</h3>
                </div>
                <div class="card__body">
                  <p style="margin: 0; color: var(--color-text);">{{ order()!.notes }}</p>
                </div>
              </div>
            }
          </div>

          <!-- Columna Derecha: Información del Cliente e Historial -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            <!-- Datos del Cliente -->
            <div class="card">
              <div class="card__header">
                <h3 style="font-size: 1.1rem;">Datos de Entrega</h3>
              </div>
              <div class="card__body" style="display: flex; flex-direction: column; gap: 0.75rem;">
                <div>
                  <span style="font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase;">Modalidad</span>
                  <div style="font-weight: 700; color: var(--color-text);">{{ order()!.deliveryType }}</div>
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase;">Cliente</span>
                  <div style="font-weight: 600;">{{ order()!.customer?.name ?? 'Mostrador' }}</div>
                  <div style="font-size: 0.85rem; color: var(--color-text-secondary);">{{ order()!.customer?.email }}</div>
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase;">Registrado por</span>
                  <div style="font-size: 0.9rem;">{{ order()!.createdBy?.name }}</div>
                </div>
              </div>
            </div>

            <!-- Historial de Estados (Trazabilidad) -->
            <div class="card">
              <div class="card__header">
                <h3 style="font-size: 1.1rem;">Historial de Trazabilidad</h3>
              </div>
              <div class="card__body">
                <div class="timeline">
                  @for (h of order()!.statusHistory ?? []; track h.id) {
                    <div class="timeline-item">
                      <div class="timeline-dot"></div>
                      <div class="timeline-content">
                        <div style="display: flex; justify-content: space-between; align-items: baseline;">
                          <span class="status-badge status-badge--{{ h.newStatus }}">
                            {{ getStatusLabel(h.newStatus) }}
                          </span>
                          <span style="font-size: 0.75rem; color: var(--color-text-muted);">
                            {{ h.changedAt | date:'HH:mm:ss' }}
                          </span>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">
                          Responsable: {{ h.changedBy?.name ?? 'Sistema' }}
                        </div>
                        @if (h.notes) {
                          <div style="font-size: 0.8rem; font-style: italic; color: var(--color-text); margin-top: 0.25rem;">
                            "{{ h.notes }}"
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Modal de Cancelación -->
      @if (showCancelModal()) {
        <div class="modal-overlay">
          <div class="modal-box">
            <h3 style="margin-bottom: 0.5rem;">Cancelar Pedido {{ order()?.orderCode }}</h3>
            <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
              Esta acción no se puede deshacer. Por favor especifica el motivo de la cancelación.
            </p>
            <div class="form-group">
              <label>Motivo de cancelación</label>
              <textarea class="form-control" rows="3" [(ngModel)]="cancelReason" placeholder="Ej. Solicitud expresa del cliente..."></textarea>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
              <button class="btn btn--secondary" (click)="closeCancelModal()">Volver</button>
              <button class="btn btn--danger" (click)="confirmCancel()">Confirmar Cancelación</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .order-detail-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .timeline {
      position: relative;
      padding-left: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;

      &::before {
        content: '';
        position: absolute;
        left: 6px;
        top: 6px;
        bottom: 6px;
        width: 2px;
        background: var(--color-border);
      }
    }

    .timeline-item {
      position: relative;
    }

    .timeline-dot {
      position: absolute;
      left: -1.5rem;
      top: 4px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--color-primary);
      border: 3px solid white;
      box-shadow: 0 0 0 1px var(--color-border);
    }

    .timeline-content {
      background: #F8FAFC;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 0.6rem 0.8rem;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-box {
      background: white;
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      max-width: 480px;
      width: 100%;
      box-shadow: var(--shadow-xl);
    }
  `]
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(OrdersService);
  private readonly socketService = inject(SocketService);
  readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  readonly order = signal<Order | null>(null);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly showCancelModal = signal<boolean>(false);
  cancelReason = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadOrder(id);
      this.socketService.subscribeToOrder(id);

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
        this.errorMessage.set(err?.error?.message ?? 'No se pudo cargar el pedido');
      }
    });
  }

  changeStatus(nextStatus: OrderStatus): void {
    const current = this.order();
    if (!current) return;

    this.ordersService.updateStatus(current.id, nextStatus).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadOrder(current.id);
        }
      },
      error: (err) => {
        alert(err?.error?.message ?? 'Error al actualizar el estado del pedido');
      }
    });
  }

  openCancelModal(): void {
    this.cancelReason = '';
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
  }

  confirmCancel(): void {
    const current = this.order();
    if (!current) return;

    this.ordersService.cancelOrder(current.id, this.cancelReason).subscribe({
      next: () => {
        this.closeCancelModal();
        this.loadOrder(current.id);
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

