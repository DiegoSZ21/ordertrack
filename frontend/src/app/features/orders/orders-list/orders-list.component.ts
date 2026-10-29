import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrdersService } from '../../../core/services/orders.service';
import { AuthService } from '../../../core/services/auth.service';
import { Order, OrderStatus, ORDER_STATUS_LABELS } from '../../../core/models/order.model';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="orders-list-page">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Gestión de Pedidos</h1>
          <p class="page-header__subtitle">Consulta, filtra y gestiona los pedidos del restaurante</p>
        </div>
        <a routerLink="/panel/pedidos/nuevo" class="btn btn--primary">
          <span class="material-icons-round">add</span>
          Nuevo Pedido
        </a>
      </div>

      <!-- Filtros y Búsqueda -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card__body" style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end;">
          <div style="flex: 1; min-width: 200px;">
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--color-text-secondary); display: block; margin-bottom: 0.25rem;">Buscar por Código</label>
            <input
              type="text"
              class="form-control"
              placeholder="Ej. ORD-0001"
              [(ngModel)]="searchCode"
              (keyup.enter)="applyFilters()"
            >
          </div>

          <div style="width: 180px;">
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--color-text-secondary); display: block; margin-bottom: 0.25rem;">Estado</label>
            <select class="form-control" [(ngModel)]="selectedStatus" (change)="applyFilters()">
              <option value="">Todos los estados</option>
              <option value="RECIBIDO">Recibido</option>
              <option value="CONFIRMADO">Confirmado</option>
              <option value="PREPARANDO">En preparación</option>
              <option value="LISTO">Listo</option>
              <option value="EN_CAMINO">En camino</option>
              <option value="ENTREGADO">Entregado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          <div style="width: 170px;">
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--color-text-secondary); display: block; margin-bottom: 0.25rem;">Fecha</label>
            <input
              type="date"
              class="form-control"
              [(ngModel)]="selectedDate"
              (change)="applyFilters()"
            >
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn--primary" (click)="applyFilters()">
              <span class="material-icons-round">search</span>
              Buscar
            </button>
            <button class="btn btn--secondary" (click)="resetFilters()">
              <span class="material-icons-round">clear</span>
              Limpiar
            </button>
          </div>
        </div>
      </div>

      @if (errorMessage()) {
        <div class="alert alert--error" style="margin-bottom: 1.5rem;">
          <span class="material-icons-round">error</span>
          {{ errorMessage() }}
        </div>
      }

      <!-- Tabla de Pedidos -->
      <div class="card">
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Modalidad</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha y Hora</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr>
                  <td colspan="7" style="text-align: center; padding: 3rem;">
                    <span class="spinner spinner--lg" style="margin: 0 auto;"></span>
                    <p style="margin-top: 1rem; color: var(--color-text-muted);">Cargando pedidos...</p>
                  </td>
                </tr>
              } @else if (orders().length === 0) {
                <tr>
                  <td colspan="7" style="text-align: center; padding: 3rem; color: var(--color-text-secondary);">
                    <span class="material-icons-round" style="font-size: 3rem; color: var(--color-text-muted); display: block; margin-bottom: 0.5rem;">receipt_long</span>
                    No se encontraron pedidos con los filtros aplicados.
                  </td>
                </tr>
              } @else {
                @for (order of orders(); track order.id) {
                  <tr>
                    <td style="font-weight: 700; color: var(--color-primary);">
                      {{ order.orderCode }}
                    </td>
                    <td>
                      <div>
                        <span style="font-weight: 600;">{{ order.customer?.name ?? 'Cliente Mostrador' }}</span>
                        @if (order.customer?.email) {
                          <span style="display: block; font-size: 0.75rem; color: var(--color-text-muted);">{{ order.customer?.email }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      <span style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: var(--color-text-secondary);">
                        {{ order.deliveryType }}
                      </span>
                    </td>
                    <td style="font-weight: 700;">
                      S/ {{ order.total }}
                    </td>
                    <td>
                      <span class="status-badge status-badge--{{ order.status }}">
                        {{ getStatusLabel(order.status) }}
                      </span>
                    </td>
                    <td style="font-size: 0.85rem; color: var(--color-text-secondary);">
                      {{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}
                    </td>
                    <td style="text-align: right;">
                      <a [routerLink]="['/panel/pedidos', order.id]" class="btn btn--secondary btn--sm">
                        <span class="material-icons-round" style="font-size: 16px;">visibility</span>
                        Detalle
                      </a>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        @if (totalPages() > 1) {
          <div class="card__footer" style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.85rem; color: var(--color-text-secondary);">
              Página {{ currentPage() }} de {{ totalPages() }} ({{ totalOrders() }} pedidos en total)
            </span>
            <div style="display: flex; gap: 0.5rem;">
              <button
                class="btn btn--secondary btn--sm"
                [disabled]="currentPage() === 1"
                (click)="changePage(currentPage() - 1)"
              >
                Anterior
              </button>
              <button
                class="btn btn--secondary btn--sm"
                [disabled]="currentPage() === totalPages()"
                (click)="changePage(currentPage() + 1)"
              >
                Siguiente
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class OrdersListComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  readonly authService = inject(AuthService);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly currentPage = signal<number>(1);
  readonly totalPages = signal<number>(1);
  readonly totalOrders = signal<number>(0);

  searchCode = '';
  selectedStatus = '';
  selectedDate = '';

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    // Si hay búsqueda por código exacto, consultar por endpoint específico
    if (this.searchCode.trim()) {
      this.ordersService.getOrderByCode(this.searchCode.trim().toUpperCase()).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.orders.set([res.data]);
            this.totalPages.set(1);
            this.totalOrders.set(1);
          } else {
            this.orders.set([]);
          }
          this.loading.set(false);
        },
        error: () => {
          this.orders.set([]);
          this.loading.set(false);
        }
      });
      return;
    }

    this.ordersService.getOrders({
      status: this.selectedStatus ? (this.selectedStatus as OrderStatus) : undefined,
      date: this.selectedDate || undefined,
      page: this.currentPage(),
      limit: 15
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.orders.set(res.data);
          this.currentPage.set(res.pagination.page);
          this.totalPages.set(res.pagination.totalPages);
          this.totalOrders.set(res.pagination.total);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Error al cargar listado de pedidos');
      }
    });
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadOrders();
  }

  resetFilters(): void {
    this.searchCode = '';
    this.selectedStatus = '';
    this.selectedDate = '';
    this.currentPage.set(1);
    this.loadOrders();
  }

  changePage(page: number): void {
    this.currentPage.set(page);
    this.loadOrders();
  }

  getStatusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status] ?? status;
  }
}
