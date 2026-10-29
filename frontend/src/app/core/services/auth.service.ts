import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { User, AuthResponse } from '../models/user.model';
import { ApiResponse } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${environment.ordersApiUrl}/auth`;

  // Estado de autenticación reactivo
  private readonly _currentUser = new BehaviorSubject<User | null>(null);
  readonly currentUser$ = this._currentUser.asObservable();

  constructor() {
    this.loadUserFromStorage();
  }

  get currentUser(): User | null {
    return this._currentUser.value;
  }

  get isLoggedIn(): boolean {
    return !!this._currentUser.value && !!this.getToken();
  }

  get token(): string | null {
    return this.getToken();
  }

  login(email: string, password: string): Observable<ApiResponse<AuthResponse>> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap((res) => {
          if (res.success) {
            this.saveSession(res.data);
          }
        })
      );
  }

  logout(): void {
    sessionStorage.removeItem('ordertrack_token');
    sessionStorage.removeItem('ordertrack_refresh');
    sessionStorage.removeItem('ordertrack_user');
    this._currentUser.next(null);
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<ApiResponse<{ token: string }>> {
    const refreshToken = sessionStorage.getItem('ordertrack_refresh');
    return this.http
      .post<ApiResponse<{ token: string }>>(`${this.apiUrl}/refresh`, { refreshToken })
      .pipe(
        tap((res) => {
          if (res.success) {
            sessionStorage.setItem('ordertrack_token', res.data.token);
          }
        })
      );
  }

  getToken(): string | null {
    return sessionStorage.getItem('ordertrack_token');
  }

  // Redirigir según el rol del usuario
  redirectByRole(): void {
    const user = this.currentUser;
    if (!user) return;

    switch (user.role) {
      case 'ADMIN':
        this.router.navigate(['/panel/dashboard']);
        break;
      case 'ATENCION':
        this.router.navigate(['/panel/pedidos']);
        break;
      case 'COCINA':
        this.router.navigate(['/panel/cocina']);
        break;
      case 'CLIENTE':
        this.router.navigate(['/menu']);
        break;
    }
  }

  private saveSession(data: AuthResponse): void {
    sessionStorage.setItem('ordertrack_token', data.token);
    sessionStorage.setItem('ordertrack_refresh', data.refreshToken);
    sessionStorage.setItem('ordertrack_user', JSON.stringify(data.user));
    this._currentUser.next(data.user);
  }

  private loadUserFromStorage(): void {
    try {
      const userStr = sessionStorage.getItem('ordertrack_user');
      const token = sessionStorage.getItem('ordertrack_token');
      if (userStr && token) {
        const user = JSON.parse(userStr) as User;
        this._currentUser.next(user);
      }
    } catch {
      this.logout();
    }
  }
}

