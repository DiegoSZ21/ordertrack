import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/product.model';

export interface DashboardSummary {
  totalToday: number;
  pendingOrders: number;
  completedToday: number;
  cancelledToday: number;
  salesToday: string;
  avgPreparationMinutes: number | null;
}

export interface SalesReportItem {
  period: string;
  total_sales: string;
  order_count: string;
}

export interface TopProductItem {
  product_name: string;
  total_quantity: string;
  total_revenue: string;
}

export interface PreparationTimeItem {
  order_code: string;
  minutes: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ordersApiUrl}/reports`;

  getSummary(): Observable<ApiResponse<DashboardSummary>> {
    return this.http.get<ApiResponse<DashboardSummary>>(`${this.apiUrl}/summary`);
  }

  getSales(params?: { from?: string; to?: string; groupBy?: 'day' | 'week' | 'month' }): Observable<ApiResponse<SalesReportItem[]>> {
    return this.http.get<ApiResponse<SalesReportItem[]>>(`${this.apiUrl}/sales`, { params: params as any });
  }

  getTopProducts(limit = 10): Observable<ApiResponse<TopProductItem[]>> {
    return this.http.get<ApiResponse<TopProductItem[]>>(`${this.apiUrl}/top-products`, { params: { limit } });
  }

  getPreparationTimes(): Observable<ApiResponse<PreparationTimeItem[]>> {
    return this.http.get<ApiResponse<PreparationTimeItem[]>>(`${this.apiUrl}/preparation-times`);
  }
}

