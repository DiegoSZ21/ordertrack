import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="empty-state" style="min-height: 80vh;">
      <span class="material-icons-round" style="font-size: 4rem; color: var(--color-text-muted);">
        search_off
      </span>
      <h2 style="font-size: 1.75rem; margin-bottom: 0.5rem;">404 — Página no encontrada</h2>
      <p style="margin-bottom: 1.5rem;">
        La página o ruta a la que intentas acceder no existe o fue movida.
      </p>
      <a routerLink="/login" class="btn btn--primary">
        <span class="material-icons-round">home</span>
        Volver al inicio
      </a>
    </div>
  `
})
export class NotFoundComponent {}
