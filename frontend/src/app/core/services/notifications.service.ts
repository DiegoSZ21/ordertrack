import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/product.model';

export interface Notification {
  id: string;
  userId: string;
  orderId?: string;
  type: string;
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
  order?: { orderCode: string };
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ordersApiUrl}/notifications`;

  getNotifications(): Observable<ApiResponse<Notification[]> & { unreadCount: number }> {
    return this.http.get<ApiResponse<Notification[]> & { unreadCount: number }>(this.apiUrl);
  }

  markAsRead(id: string): Observable<ApiResponse<Notification>> {
    return this.http.patch<ApiResponse<Notification>>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.apiUrl}/read-all`, {});
  }
}

