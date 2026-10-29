import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  private readonly authService = inject(AuthService);

  private readonly _connectionStatus = new Subject<boolean>();
  readonly connectionStatus$ = this._connectionStatus.asObservable();

  connect(): void {
    if (this.socket?.connected) return;

    const token = this.authService.token;
    if (!token) return;

    this.socket = io(environment.realtimeUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      this._connectionStatus.next(true);
    });

    this.socket.on('disconnect', () => {
      this._connectionStatus.next(false);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('Socket error:', err.message);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  subscribeToOrder(orderId: string): void {
    this.socket?.emit('subscribe:order', { orderId });
  }

  unsubscribeFromOrder(orderId: string): void {
    this.socket?.emit('unsubscribe:order', { orderId });
  }

  // Escuchar eventos de cambio de estado de pedido
  onOrderStatusChanged(): Observable<{
    orderId: string;
    orderCode: string;
    newStatus: string;
    previousStatus: string;
  }> {
    return new Observable((observer) => {
      this.socket?.on('order:statusChanged', (data) => observer.next(data));
      return () => this.socket?.off('order:statusChanged');
    });
  }

  // Escuchar nuevos pedidos (cocina / atención)
  onOrderCreated(): Observable<{
    orderId: string;
    orderCode: string;
    total: string;
    deliveryType: string;
  }> {
    return new Observable((observer) => {
      this.socket?.on('order:created', (data) => observer.next(data));
      return () => this.socket?.off('order:created');
    });
  }

  // Escuchar notificaciones
  onNotification(): Observable<{
    type: string;
    orderId: string;
    message: string;
    timestamp: string;
  }> {
    return new Observable((observer) => {
      this.socket?.on('notification:created', (data) => observer.next(data));
      return () => this.socket?.off('notification:created');
    });
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

