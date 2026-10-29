import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ReportsService,
  DashboardSummary,
  SalesReportItem,
  TopProductItem,
  PreparationTimeItem
} from '../../core/services/reports.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reports-page">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Reportes y Estadísticas del Restaurante</h1>
          <p class="page-header__subtitle">Métricas históricas, rendimiento operativo y volumen de ventas</p>
        </div>
        <button class="btn btn--secondary" (click)="loadAllReports()">
          <span class="material-icons-round">refresh</span>
          Refrescar datos
        </button>
      </div>

      <!-- Resumen General -->
      @if (summary()) {
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--primary">
              <span class="material-icons-round">payments</span>
            </div>
            <div class="stat-card__label">Facturación hoy</div>
            <div class="stat-card__value">S/ {{ summary()!.salesToday }}</div>
          </div>

          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--success">
              <span class="material-icons-round">task_alt</span>
            </div>
            <div class="stat-card__label">Entregados hoy</div>
            <div class="stat-card__value">{{ summary()!.completedToday }}</div>
          </div>

          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--warning">
              <span class="material-icons-round">hourglass_bottom</span>
            </div>
            <div class="stat-card__label">Tiempo promedio</div>
            <div class="stat-card__value">{{ summary()!.avgPreparationMinutes ?? 'N/D' }} min</div>
          </div>

          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--error">
              <span class="material-icons-round">cancel</span>
            </div>
            <div class="stat-card__label">Cancelaciones hoy</div>
            <div class="stat-card__value">{{ summary()!.cancelledToday }}</div>
          </div>
        </div>
      }

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
        <!-- Top 10 Platos más vendidos -->
        <div class="card">
          <div class="card__header">
            <h3 style="font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
              <span class="material-icons-round" style="color: var(--color-warning);">military_tech</span>
              Top Productos más Vendidos
            </h3>
          </div>
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Plato / Bebida</th>
                  <th style="text-align: right;">Cantidad</th>
                  <th style="text-align: right;">Ingresos Totales</th>
                </tr>
              </thead>
              <tbody>
                @if (topProducts().length === 0) {
                  <tr>
                    <td colspan="3" style="text-align: center; color: var(--color-text-muted); padding: 2rem;">
                      No hay datos suficientes
                    </td>
                  </tr>
                } @else {
                  @for (p of topProducts(); track p.product_name) {
                    <tr>
                      <td style="font-weight: 600;">{{ p.product_name }}</td>
                      <td style="text-align: right; font-weight: 700;">{{ p.total_quantity }}</td>
                      <td style="text-align: right; font-weight: 700; color: var(--color-success);">
                        S/ {{ p.total_revenue }}
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tiempos de Preparación de Órdenes -->
        <div class="card">
          <div class="card__header">
            <h3 style="font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
              <span class="material-icons-round" style="color: var(--color-primary);">timer</span>
              Tiempos de Preparación (Últimos 7 días)
            </h3>
          </div>
          <div class="table-wrapper" style="max-height: 380px; overflow-y: auto;">
            <table class="table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th style="text-align: right;">Duración</th>
                  <th>Estado de Eficiencia</th>
                </tr>
              </thead>
              <tbody>
                @if (prepTimes().length === 0) {
                  <tr>
                    <td colspan="3" style="text-align: center; color: var(--color-text-muted); padding: 2rem;">
                      No hay órdenes completadas recientemente
                    </td>
                  </tr>
                } @else {
                  @for (t of prepTimes(); track t.order_code) {
                    <tr>
                      <td style="font-weight: 700;">{{ t.order_code }}</td>
                      <td style="text-align: right; font-weight: 700;">{{ t.minutes }} min</td>
                      <td>
                        @if (t.minutes <= 25) {
                          <span class="status-badge status-badge--LISTO">Óptimo</span>
                        } @else if (t.minutes <= 40) {
                          <span class="status-badge status-badge--PREPARANDO">Aceptable</span>
                        } @else {
                          <span class="status-badge status-badge--CANCELADO">Demorado</span>
                        }
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Histórico de Ventas -->
      <div class="card">
        <div class="card__header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span class="material-icons-round" style="color: var(--color-info);">insights</span>
            Evolución de Ventas por Período
          </h3>
          <div style="display: flex; gap: 0.5rem;">
            <button
              class="btn btn--sm"
              [class.btn--primary]="groupBy === 'day'"
              [class.btn--secondary]="groupBy !== 'day'"
              (click)="setGroupBy('day')"
            >
              Diario
            </button>
            <button
              class="btn btn--sm"
              [class.btn--primary]="groupBy === 'week'"
              [class.btn--secondary]="groupBy !== 'week'"
              (click)="setGroupBy('week')"
            >
              Semanal
            </button>
            <button
              class="btn btn--sm"
              [class.btn--primary]="groupBy === 'month'"
              [class.btn--secondary]="groupBy !== 'month'"
              (click)="setGroupBy('month')"
            >
              Mensual
            </button>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Período</th>
                <th style="text-align: center;">Pedidos Entregados</th>
                <th style="text-align: right;">Total Recaudado</th>
              </tr>
            </thead>
            <tbody>
              @if (sales().length === 0) {
                <tr>
                  <td colspan="3" style="text-align: center; color: var(--color-text-muted); padding: 2rem;">
                    No se registran ventas para el período seleccionado
                  </td>
                </tr>
              } @else {
                @for (s of sales(); track s.period) {
                  <tr>
                    <td style="font-weight: 600;">{{ s.period }}</td>
                    <td style="text-align: center; font-weight: 600;">{{ s.order_count }} pedidos</td>
                    <td style="text-align: right; font-weight: 800; color: var(--color-primary);">
                      S/ {{ s.total_sales }}
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reports-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
  `]
})
export class ReportsComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);

  readonly summary = signal<DashboardSummary | null>(null);
  readonly topProducts = signal<TopProductItem[]>([]);
  readonly prepTimes = signal<PreparationTimeItem[]>([]);
  readonly sales = signal<SalesReportItem[]>([]);
  groupBy: 'day' | 'week' | 'month' = 'day';

  ngOnInit(): void {
    this.loadAllReports();
  }

  loadAllReports(): void {
    this.reportsService.getSummary().subscribe({
      next: (res) => { if (res.success) this.summary.set(res.data); }
    });

    this.reportsService.getTopProducts(10).subscribe({
      next: (res) => { if (res.success) this.topProducts.set(res.data); }
    });

    this.reportsService.getPreparationTimes().subscribe({
      next: (res) => { if (res.success) this.prepTimes.set(res.data); }
    });

    this.loadSales();
  }

  setGroupBy(val: 'day' | 'week' | 'month'): void {
    this.groupBy = val;
    this.loadSales();
  }

  loadSales(): void {
    this.reportsService.getSales({ groupBy: this.groupBy }).subscribe({
      next: (res) => { if (res.success) this.sales.set(res.data); }
    });
  }
}

