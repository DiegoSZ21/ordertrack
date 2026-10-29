import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportsService, DashboardSummary, TopProductItem } from '../../core/services/reports.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-page">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Panel de Control General</h1>
          <p class="page-header__subtitle">Métricas operativas del restaurante en tiempo real</p>
        </div>
        <button class="btn btn--secondary" (click)="loadData()" [disabled]="loading()">
          <span class="material-icons-round" [class.spinner]="loading()">sync</span>
          Actualizar datos
        </button>
      </div>

      @if (errorMessage()) {
        <div class="alert alert--error" style="margin-bottom: 1.5rem;">
          <span class="material-icons-round">error</span>
          {{ errorMessage() }}
        </div>
      }

      @if (loading() && !summary()) {
        <div class="stats-grid">
          <div class="card skeleton" style="height: 120px;"></div>
          <div class="card skeleton" style="height: 120px;"></div>
          <div class="card skeleton" style="height: 120px;"></div>
          <div class="card skeleton" style="height: 120px;"></div>
        </div>
      } @else if (summary()) {
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--primary">
              <span class="material-icons-round">receipt_long</span>
            </div>
            <div class="stat-card__label">Pedidos de hoy</div>
            <div class="stat-card__value">{{ summary()!.totalToday }}</div>
          </div>

          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--warning">
              <span class="material-icons-round">pending_actions</span>
            </div>
            <div class="stat-card__label">Pedidos pendientes</div>
            <div class="stat-card__value">{{ summary()!.pendingOrders }}</div>
          </div>

          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--success">
              <span class="material-icons-round">check_circle</span>
            </div>
            <div class="stat-card__label">Entregados hoy</div>
            <div class="stat-card__value">{{ summary()!.completedToday }}</div>
          </div>

          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--error">
              <span class="material-icons-round">cancel</span>
            </div>
            <div class="stat-card__label">Cancelados hoy</div>
            <div class="stat-card__value">{{ summary()!.cancelledToday }}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
          <!-- Ventas del Día -->
          <div class="card">
            <div class="card__header">
              <h3 style="font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
                <span class="material-icons-round" style="color: var(--color-success);">payments</span>
                Ingresos del día
              </h3>
            </div>
            <div class="card__body" style="text-align: center; padding: 2.5rem 1.5rem;">
              <span style="font-size: 0.9rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Total facturado hoy</span>
              <div style="font-size: 3rem; font-weight: 800; color: var(--color-text); margin-top: 0.5rem;">
                S/ {{ summary()!.salesToday }}
              </div>
              <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.5rem;">
                Calculado en base a órdenes con estado ENTREGADO
              </p>
            </div>
          </div>

          <!-- Tiempo de Preparación -->
          <div class="card">
            <div class="card__header">
              <h3 style="font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
                <span class="material-icons-round" style="color: var(--color-primary);">timer</span>
                Tiempo promedio de cocina
              </h3>
            </div>
            <div class="card__body" style="text-align: center; padding: 2.5rem 1.5rem;">
              <span style="font-size: 0.9rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Tiempo de preparación</span>
              <div style="font-size: 3rem; font-weight: 800; color: var(--color-primary); margin-top: 0.5rem;">
                {{ summary()!.avgPreparationMinutes !== null ? summary()!.avgPreparationMinutes + ' min' : 'N/D' }}
              </div>
              <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.5rem;">
                Desde estado RECIBIDO hasta ENTREGADO
              </p>
            </div>
          </div>
        </div>

        <!-- Top Productos -->
        <div class="card">
          <div class="card__header">
            <h3 style="font-size: 1.1rem;">Productos más vendidos</h3>
            <a routerLink="/panel/reportes" class="btn btn--ghost btn--sm">Ver reportes completos</a>
          </div>
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style="text-align: right;">Cantidad vendida</th>
                  <th style="text-align: right;">Total generado</th>
                </tr>
              </thead>
              <tbody>
                @if (topProducts().length === 0) {
                  <tr>
                    <td colspan="3" style="text-align: center; color: var(--color-text-secondary); padding: 2rem;">
                      No hay suficientes ventas registradas aún.
                    </td>
                  </tr>
                } @else {
                  @for (prod of topProducts(); track prod.product_name) {
                    <tr>
                      <td style="font-weight: 600;">{{ prod.product_name }}</td>
                      <td style="text-align: right;">{{ prod.total_quantity }} u.</td>
                      <td style="text-align: right; font-weight: 600;">S/ {{ prod.total_revenue }}</td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);

  readonly summary = signal<DashboardSummary | null>(null);
  readonly topProducts = signal<TopProductItem[]>([]);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.reportsService.getSummary().subscribe({
      next: (res) => {
        if (res.success) {
          this.summary.set(res.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Error al cargar resumen del dashboard');
      }
    });

    this.reportsService.getTopProducts(5).subscribe({
      next: (res) => {
        if (res.success) {
          this.topProducts.set(res.data);
        }
      },
      error: () => {}
    });
  }
}
