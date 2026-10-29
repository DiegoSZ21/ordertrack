import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order, CreateOrderDto, OrderStatus } from '../models/order.model';
import { ApiResponse, PaginatedResponse } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ordersApiUrl}/orders`;

  getOrders(filters?: {
    status?: OrderStatus;
    page?: number;
    limit?: number;
    date?: string;
  }): Observable<PaginatedResponse<Order>> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.page) params = params.set('page', filters.page.toString());
    if (filters?.limit) params = params.set('limit', filters.limit.toString());
    if (filters?.date) params = params.set('date', filters.date);

    return this.http.get<PaginatedResponse<Order>>(this.apiUrl, { params });
  }

  getOrderById(id: string): Observable<ApiResponse<Order>> {
    return this.http.get<ApiResponse<Order>>(`${this.apiUrl}/${id}`);
  }

  getOrderByCode(code: string): Observable<ApiResponse<Order>> {
    return this.http.get<ApiResponse<Order>>(`${this.apiUrl}/code/${code}`);
  }

  createOrder(dto: CreateOrderDto): Observable<ApiResponse<Order>> {
    return this.http.post<ApiResponse<Order>>(this.apiUrl, dto);
  }

  updateStatus(id: string, status: OrderStatus, notes?: string): Observable<ApiResponse<Order>> {
    return this.http.patch<ApiResponse<Order>>(`${this.apiUrl}/${id}/status`, { status, notes });
  }

  cancelOrder(id: string, reason?: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/${id}/cancel`, { reason });
  }

  getOrderHistory(id: string): Observable<ApiResponse<Order['statusHistory']>> {
    return this.http.get<ApiResponse<Order['statusHistory']>>(`${this.apiUrl}/${id}/history`);
  }
}

