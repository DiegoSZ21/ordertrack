import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { Subject, takeUntil } from 'rxjs';
import { User, Role } from '../../core/models/user.model';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="shell">
      <!-- Sidebar -->
      <aside class="sidebar" [class.sidebar--collapsed]="sidebarCollapsed()">
        <!-- Logo -->
        <div class="sidebar__logo">
          <div class="sidebar__logo-icon">
            <span class="material-icons-round">restaurant_menu</span>
          </div>
          @if (!sidebarCollapsed()) {
            <div class="sidebar__logo-text">
              <span class="sidebar__app-name">OrderTrack</span>
              <span class="sidebar__restaurant">El Sabor Peruano</span>
            </div>
          }
          <button class="sidebar__toggle" (click)="toggleSidebar()" [attr.aria-label]="'Colapsar menú'">
            <span class="material-icons-round">{{ sidebarCollapsed() ? 'menu' : 'menu_open' }}</span>
          </button>
        </div>

        <!-- Navegación -->
        <nav class="sidebar__nav">
          @for (item of navItems(); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="sidebar__link--active"
              class="sidebar__link"
              [title]="item.label"
            >
              <span class="material-icons-round">{{ item.icon }}</span>
              @if (!sidebarCollapsed()) {
                <span>{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <!-- Usuario en sidebar -->
        <div class="sidebar__user">
          <div class="sidebar__user-avatar">
            {{ userInitials() }}
          </div>
          @if (!sidebarCollapsed()) {
            <div class="sidebar__user-info">
              <span class="sidebar__user-name">{{ currentUser()?.name }}</span>
              <span class="sidebar__user-role">{{ roleLabel() }}</span>
            </div>
            <button class="btn btn--ghost btn--icon" (click)="logout()" title="Cerrar sesión">
              <span class="material-icons-round">logout</span>
            </button>
          }
        </div>
      </aside>

      <!-- Contenido principal -->
      <div class="shell__main">
        <!-- Header -->
        <header class="shell__header">
          <div class="shell__header-left">
            <!-- Botón hamburguesa (móvil) -->
            <button class="btn btn--ghost btn--icon show-mobile" (click)="toggleMobileSidebar()">
              <span class="material-icons-round">menu</span>
            </button>
            <h2 class="shell__page-title">{{ currentPageTitle() }}</h2>
          </div>

          <div class="shell__header-right">
            <!-- Indicador de conexión -->
            <div class="connection-indicator" [class.connection-indicator--connected]="socketConnected()">
              <span class="connection-indicator__dot"></span>
              @if (!sidebarCollapsed()) {
                <span class="connection-indicator__label">
                  {{ socketConnected() ? 'Conectado' : 'Desconectado' }}
                </span>
              }
            </div>

            <!-- Notificaciones -->
            <div class="notification-bell" (click)="toggleNotifications()">
              <button class="btn btn--ghost btn--icon">
                <span class="material-icons-round">notifications</span>
              </button>
              @if (unreadCount() > 0) {
                <span class="notification-bell__badge">{{ unreadCount() > 9 ? '9+' : unreadCount() }}</span>
              }
            </div>

            <!-- Avatar usuario -->
            <div class="header-user">
              <div class="header-user__avatar">{{ userInitials() }}</div>
              @if (true) {
                <div class="header-user__info hide-mobile">
                  <span class="header-user__name">{{ currentUser()?.name }}</span>
                  <span class="header-user__role">{{ roleLabel() }}</span>
                </div>
              }
              <button class="btn btn--ghost btn--icon hide-mobile" (click)="logout()" title="Cerrar sesión">
                <span class="material-icons-round">logout</span>
              </button>
            </div>
          </div>
        </header>

        <!-- Vista de rutas hijas -->
        <main class="shell__content">
          <div class="main-content__inner">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      min-height: 100vh;
      background-color: var(--color-bg);
    }

    // ── Sidebar ─────────────────────────────────────────────────────────────────
    .sidebar {
      width: var(--sidebar-width);
      min-height: 100vh;
      background: #0F172A;
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      transition: width var(--transition-slow);
      z-index: 100;
      flex-shrink: 0;

      &--collapsed {
        width: var(--sidebar-collapsed-width);
      }

      @media (max-width: 768px) {
        display: none;
      }
    }

    .sidebar__logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.25rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      min-height: var(--header-height);

      &-icon {
        width: 36px;
        height: 36px;
        background: var(--color-primary);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        .material-icons-round { font-size: 1.2rem; color: white; }
      }

      &-text {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
      }
    }

    .sidebar__app-name {
      font-size: 1rem;
      font-weight: 700;
      color: white;
      line-height: 1;
    }

    .sidebar__restaurant {
      font-size: 0.7rem;
      color: rgba(255,255,255,0.5);
      margin-top: 2px;
    }

    .sidebar__toggle {
      background: none;
      border: none;
      color: rgba(255,255,255,0.4);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      &:hover { color: white; background: rgba(255,255,255,0.1); }
      .material-icons-round { font-size: 1.2rem; }
    }

    .sidebar__nav {
      flex: 1;
      padding: 0.75rem 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      overflow-y: auto;
    }

    .sidebar__link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.875rem;
      border-radius: 8px;
      color: rgba(255,255,255,0.65);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all var(--transition-base);
      white-space: nowrap;
      overflow: hidden;

      .material-icons-round { font-size: 1.25rem; flex-shrink: 0; }

      &:hover {
        color: white;
        background: rgba(255,255,255,0.08);
        text-decoration: none;
      }

      &--active {
        color: white;
        background: var(--color-primary);
      }
    }

    .sidebar__user {
      padding: 0.875rem 0.75rem;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .sidebar__user-avatar {
      width: 34px;
      height: 34px;
      background: var(--color-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      color: white;
      flex-shrink: 0;
    }

    .sidebar__user-info {
      flex: 1;
      min-width: 0;
    }

    .sidebar__user-name {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      color: white;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar__user-role {
      display: block;
      font-size: 0.7rem;
      color: rgba(255,255,255,0.5);
    }

    // ── Header ───────────────────────────────────────────────────────────────────
    .shell__main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .shell__header {
      position: sticky;
      top: 0;
      z-index: 50;
      height: var(--header-height);
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      gap: 1rem;

      @media (max-width: 640px) {
        padding: 0 1rem;
        height: var(--header-height-mobile);
      }
    }

    .shell__header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .shell__page-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text);

      @media (max-width: 640px) { font-size: 1rem; }
    }

    .shell__header-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .shell__content {
      flex: 1;
      overflow-y: auto;
    }

    // Indicador de conexión
    .connection-indicator {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--color-error);

      &__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--color-error);
        animation: pulse-error 2s ease-in-out infinite;
      }

      &--connected {
        color: var(--color-success);
        .connection-indicator__dot {
          background-color: var(--color-success);
          animation: none;
        }
      }

      &__label { font-weight: 500; }
    }

    @keyframes pulse-error {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    // Campana de notificaciones
    .notification-bell {
      position: relative;
      cursor: pointer;

      &__badge {
        position: absolute;
        top: 2px;
        right: 2px;
        min-width: 16px;
        height: 16px;
        background: var(--color-error);
        color: white;
        font-size: 0.625rem;
        font-weight: 700;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 3px;
        border: 1.5px solid white;
        pointer-events: none;
      }
    }

    // Avatar de header
    .header-user {
      display: flex;
      align-items: center;
      gap: 0.625rem;

      &__avatar {
        width: 34px;
        height: 34px;
        background: var(--color-primary-light);
        color: var(--color-primary);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 700;
        flex-shrink: 0;
      }

      &__info {
        display: flex;
        flex-direction: column;
      }

      &__name {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-text);
        white-space: nowrap;
      }

      &__role {
        font-size: 0.7rem;
        color: var(--color-text-secondary);
      }
    }
  `],
})
export class ShellComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly socketService = inject(SocketService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly currentUser = signal<User | null>(null);
  readonly sidebarCollapsed = signal(false);
  readonly socketConnected = signal(false);
  readonly unreadCount = signal(0);

  ngOnInit(): void {
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.currentUser.set(user);
    });

    this.socketService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((connected) => this.socketConnected.set(connected));

    this.socketConnected.set(this.socketService.isConnected);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get navItems(): () => { path: string; icon: string; label: string }[] {
    return () => {
      const role = this.currentUser()?.role;
      const base = '/panel/';
      const items: { path: string; icon: string; label: string }[] = [];

      if (role === Role.ADMIN) {
        items.push({ path: `${base}dashboard`, icon: 'dashboard', label: 'Dashboard' });
        items.push({ path: `${base}pedidos`, icon: 'receipt_long', label: 'Pedidos' });
        items.push({ path: `${base}cocina`, icon: 'soup_kitchen', label: 'Cocina' });
        items.push({ path: `${base}productos`, icon: 'inventory_2', label: 'Productos' });
        items.push({ path: `${base}reportes`, icon: 'bar_chart', label: 'Reportes' });
      } else if (role === Role.ATENCION) {
        items.push({ path: `${base}pedidos`, icon: 'receipt_long', label: 'Pedidos' });
        items.push({ path: `${base}pedidos/nuevo`, icon: 'add_circle', label: 'Nuevo pedido' });
      } else if (role === Role.COCINA) {
        items.push({ path: `${base}cocina`, icon: 'soup_kitchen', label: 'Panel de cocina' });
      } else if (role === Role.CLIENTE) {
        items.push({ path: '/menu', icon: 'restaurant_menu', label: 'Menú' });
        items.push({ path: `${base}mis-pedidos`, icon: 'receipt_long', label: 'Mis pedidos' });
      }

      return items;
    };
  }

  userInitials(): string {
    const name = this.currentUser()?.name ?? '';
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0] ?? '')
      .join('')
      .toUpperCase();
  }

  roleLabel(): string {
    const map: Record<string, string> = {
      ADMIN: 'Administrador',
      ATENCION: 'Atención al cliente',
      COCINA: 'Cocina',
      CLIENTE: 'Cliente',
    };
    return map[this.currentUser()?.role ?? ''] ?? '';
  }

  currentPageTitle(): string {
    const url = this.router.url;
    if (url.includes('dashboard')) return 'Dashboard';
    if (url.includes('pedidos/nuevo')) return 'Nuevo pedido';
    if (url.includes('pedidos')) return 'Pedidos';
    if (url.includes('cocina')) return 'Panel de cocina';
    if (url.includes('productos')) return 'Productos';
    if (url.includes('reportes')) return 'Reportes';
    if (url.includes('mis-pedidos')) return 'Mis pedidos';
    return 'OrderTrack';
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  toggleMobileSidebar(): void {
    // En móvil podría mostrarse con una clase
  }

  toggleNotifications(): void {
    // Panel de notificaciones
  }

  logout(): void {
    this.authService.logout();
  }
}

