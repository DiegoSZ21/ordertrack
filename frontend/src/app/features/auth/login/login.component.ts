import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-page">
      <div class="login-container">
        <!-- Logo -->
        <div class="login-brand">
          <div class="login-brand__icon">
            <span class="material-icons-round">restaurant_menu</span>
          </div>
          <h1 class="login-brand__name">OrderTrack</h1>
          <p class="login-brand__subtitle">Plataforma de Gestión de Pedidos</p>
          <span class="login-brand__badge">Restaurante El Sabor Peruano</span>
        </div>

        <!-- Formulario -->
        <div class="login-card">
          <div class="login-card__header">
            <h2>Iniciar sesión</h2>
            <p>Ingresa tus credenciales para continuar</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="login-form">
            <!-- Error general -->
            @if (errorMessage()) {
              <div class="alert alert--error">
                <span class="material-icons-round">error_outline</span>
                {{ errorMessage() }}
              </div>
            }

            <!-- Email -->
            <div class="form-group">
              <label for="email">Correo electrónico</label>
              <div class="input-wrapper">
                <span class="input-icon material-icons-round">email</span>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  class="form-control"
                  [class.is-invalid]="isFieldInvalid('email')"
                  placeholder="nombre@empresa.pe"
                  autocomplete="email"
                >
              </div>
              @if (isFieldInvalid('email')) {
                <span class="form-error">
                  <span class="material-icons-round">warning</span>
                  {{ getFieldError('email') }}
                </span>
              }
            </div>

            <!-- Contraseña -->
            <div class="form-group">
              <label for="password">Contraseña</label>
              <div class="input-wrapper">
                <span class="input-icon material-icons-round">lock</span>
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  class="form-control"
                  [class.is-invalid]="isFieldInvalid('password')"
                  placeholder="••••••••"
                  autocomplete="current-password"
                >
                <button
                  type="button"
                  class="input-toggle"
                  (click)="showPassword.set(!showPassword())"
                  [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                >
                  <span class="material-icons-round">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
              @if (isFieldInvalid('password')) {
                <span class="form-error">
                  <span class="material-icons-round">warning</span>
                  {{ getFieldError('password') }}
                </span>
              }
            </div>

            <!-- Botón de login -->
            <button
              type="submit"
              class="btn btn--primary btn--full"
              [disabled]="loading() || form.invalid"
            >
              @if (loading()) {
                <span class="spinner spinner--sm"></span>
                Iniciando sesión...
              } @else {
                <span class="material-icons-round">login</span>
                Iniciar sesión
              }
            </button>
          </form>

          <!-- Acceso rápido para demo -->
          <div class="demo-accounts">
            <p class="demo-accounts__title">Cuentas de demostración</p>
            <div class="demo-accounts__grid">
              @for (account of demoAccounts; track account.email) {
                <button
                  class="demo-account"
                  (click)="loginWithDemo(account.email, account.password)"
                  [title]="account.description"
                >
                  <span class="material-icons-round">{{ account.icon }}</span>
                  <span>{{ account.label }}</span>
                </button>
              }
            </div>
          </div>
        </div>

        <p class="login-footer">
          Universidad Privada del Norte — Soluciones Web y Aplicaciones Distribuidas
        </p>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0369a1 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .login-container {
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .login-brand {
      text-align: center;
      color: white;

      &__icon {
        width: 64px;
        height: 64px;
        background: rgba(255,255,255,0.2);
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1rem;
        backdrop-filter: blur(10px);

        .material-icons-round { font-size: 2rem; color: white; }
      }

      &__name {
        font-size: 2rem;
        font-weight: 800;
        color: white;
        letter-spacing: -0.03em;
        margin-bottom: 0.25rem;
      }

      &__subtitle {
        font-size: 0.875rem;
        color: rgba(255,255,255,0.8);
        margin-bottom: 0.75rem;
      }

      &__badge {
        display: inline-block;
        background: rgba(255,255,255,0.15);
        color: white;
        font-size: 0.75rem;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        backdrop-filter: blur(10px);
      }
    }

    .login-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      overflow: hidden;

      &__header {
        padding: 1.75rem 2rem 1rem;
        h2 { font-size: 1.375rem; font-weight: 700; color: #0F172A; }
        p  { font-size: 0.875rem; color: #64748B; margin-top: 0.25rem; }
      }
    }

    .login-form {
      padding: 0 2rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .input-wrapper {
      position: relative;

      .input-icon {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.125rem;
        color: #94A3B8;
      }

      .form-control {
        padding-left: 2.5rem;
        padding-right: 2.75rem;
      }

      .input-toggle {
        position: absolute;
        right: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        color: #94A3B8;
        padding: 0.25rem;
        border-radius: 4px;
        display: flex;
        align-items: center;
        &:hover { color: #64748B; }
      }
    }

    .demo-accounts {
      border-top: 1px solid #F1F5F9;
      padding: 1.25rem 2rem;

      &__title {
        font-size: 0.75rem;
        font-weight: 500;
        color: #94A3B8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.75rem;
      }

      &__grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }
    }

    .demo-account {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      background: #F8FAFC;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 500;
      color: #475569;
      transition: all 0.15s ease;
      font-family: 'Inter', sans-serif;

      .material-icons-round { font-size: 1rem; color: #2563EB; }

      &:hover {
        background: #EFF6FF;
        border-color: #BFDBFE;
        color: #2563EB;
      }
    }

    .login-footer {
      text-align: center;
      font-size: 0.75rem;
      color: rgba(255,255,255,0.6);
    }

    .alert {
      margin-bottom: 1rem;
    }
  `],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly demoAccounts = [
    { email: 'admin@ordertrack.pe', password: 'Admin123!', label: 'Administrador', icon: 'admin_panel_settings', description: 'Acceso completo' },
    { email: 'atencion@ordertrack.pe', password: 'Atencion123!', label: 'Atención', icon: 'support_agent', description: 'Gestión de pedidos' },
    { email: 'cocina@ordertrack.pe', password: 'Cocina123!', label: 'Cocina', icon: 'soup_kitchen', description: 'Panel de cocina' },
    { email: 'cliente1@ordertrack.pe', password: 'Cliente123!', label: 'Cliente', icon: 'person', description: 'Vista de cliente' },
  ];

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getFieldError(field: string): string {
    const control = this.form.get(field);
    if (!control?.errors) return '';
    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['email']) return 'Ingresa un correo electrónico válido';
    if (control.errors['minlength']) return 'La contraseña debe tener al menos 6 caracteres';
    return 'Campo inválido';
  }

  loginWithDemo(email: string, password: string): void {
    this.form.setValue({ email, password });
    this.onSubmit();
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.value as { email: string; password: string };

    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.authService.redirectByRole();
      },
      error: (err: any) => {
        this.loading.set(false);
        const msg =
          err?.error?.message ?? 'Error al iniciar sesión. Verifica tus credenciales.';
        this.errorMessage.set(msg);
      },
    });
  }
}

