import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { Role } from './core/models/user.model';

export const routes: Routes = [
  // Redirección raíz
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },

  // Autenticación
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },

  // Menú público (accesible para todos)
  {
    path: 'menu',
    loadComponent: () =>
      import('./features/menu/menu.component').then((m) => m.MenuComponent),
  },

  // Seguimiento de pedido (requiere autenticación)
  {
    path: 'seguimiento/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tracking/tracking.component').then((m) => m.TrackingComponent),
  },

  // Panel principal (protegido)
  {
    path: 'panel',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      // Dashboard — solo ADMIN
      {
        path: 'dashboard',
        canActivate: [roleGuard([Role.ADMIN])],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },

      // Pedidos — ADMIN, ATENCION
      {
        path: 'pedidos',
        canActivate: [roleGuard([Role.ADMIN, Role.ATENCION])],
        loadComponent: () =>
          import('./features/orders/orders-list/orders-list.component').then(
            (m) => m.OrdersListComponent
          ),
      },
      {
        path: 'pedidos/nuevo',
        canActivate: [roleGuard([Role.ADMIN, Role.ATENCION, Role.CLIENTE])],
        loadComponent: () =>
          import('./features/orders/order-form/order-form.component').then(
            (m) => m.OrderFormComponent
          ),
      },
      {
        path: 'pedidos/:id',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/orders/order-detail/order-detail.component').then(
            (m) => m.OrderDetailComponent
          ),
      },

      // Cocina
      {
        path: 'cocina',
        canActivate: [roleGuard([Role.ADMIN, Role.COCINA])],
        loadComponent: () =>
          import('./features/kitchen/kitchen.component').then((m) => m.KitchenComponent),
      },

      // Productos — ADMIN
      {
        path: 'productos',
        canActivate: [roleGuard([Role.ADMIN])],
        loadComponent: () =>
          import('./features/products/products.component').then((m) => m.ProductsComponent),
      },

      // Mis pedidos (cliente)
      {
        path: 'mis-pedidos',
        canActivate: [roleGuard([Role.CLIENTE])],
        loadComponent: () =>
          import('./features/my-orders/my-orders.component').then((m) => m.MyOrdersComponent),
      },

      // Reportes — ADMIN
      {
        path: 'reportes',
        canActivate: [roleGuard([Role.ADMIN])],
        loadComponent: () =>
          import('./features/reports/reports.component').then((m) => m.ReportsComponent),
      },

      // Redirección por defecto del panel
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // 404
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];

