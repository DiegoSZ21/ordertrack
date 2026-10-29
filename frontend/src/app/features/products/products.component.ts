import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProductsService } from '../../core/services/products.service';
import { Product, Category } from '../../core/models/product.model';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="products-mgmt-page">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Administración del Catálogo</h1>
          <p class="page-header__subtitle">Crear, actualizar precios y gestionar la disponibilidad de productos</p>
        </div>
        <button class="btn btn--primary" (click)="openCreateModal()">
          <span class="material-icons-round">add</span>
          Nuevo Producto
        </button>
      </div>

      @if (errorMessage()) {
        <div class="alert alert--error" style="margin-bottom: 1.5rem;">
          <span class="material-icons-round">error</span>
          {{ errorMessage() }}
        </div>
      }

      <!-- Filtros -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card__body" style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <input
            type="text"
            class="form-control"
            style="flex: 1;"
            placeholder="Buscar por nombre de producto..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="applyFilters()"
          >
          <select class="form-control" style="width: 220px;" [(ngModel)]="selectedCategory" (ngModelChange)="applyFilters()">
            <option value="">Todas las categorías</option>
            @for (cat of categories(); track cat.id) {
              <option [value]="cat.id">{{ cat.name }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Tabla de Productos -->
      <div class="card">
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th style="text-align: right;">Precio</th>
                <th style="text-align: center;">Disponibilidad</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr>
                  <td colspan="5" style="text-align: center; padding: 3rem;">
                    <span class="spinner spinner--lg" style="margin: 0 auto;"></span>
                    <p style="margin-top: 1rem; color: var(--color-text-muted);">Cargando catálogo...</p>
                  </td>
                </tr>
              } @else if (filteredProducts().length === 0) {
                <tr>
                  <td colspan="5" style="text-align: center; padding: 3rem; color: var(--color-text-secondary);">
                    No se encontraron productos registrados.
                  </td>
                </tr>
              } @else {
                @for (prod of filteredProducts(); track prod.id) {
                  <tr>
                    <td>
                      <div style="font-weight: 700;">{{ prod.name }}</div>
                      <div style="font-size: 0.75rem; color: var(--color-text-muted); max-width: 320px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                        {{ prod.description || 'Sin descripción' }}
                      </div>
                    </td>
                    <td>
                      <span class="status-badge status-badge--CONFIRMADO">
                        {{ prod.category?.name }}
                      </span>
                    </td>
                    <td style="text-align: right; font-weight: 700;">
                      S/ {{ prod.price }}
                    </td>
                    <td style="text-align: center;">
                      @if (prod.available) {
                        <span class="status-badge status-badge--LISTO">Disponible</span>
                      } @else {
                        <span class="status-badge status-badge--CANCELADO">No disponible</span>
                      }
                    </td>
                    <td style="text-align: right;">
                      <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="btn btn--secondary btn--sm" (click)="openEditModal(prod)">
                          <span class="material-icons-round" style="font-size: 16px;">edit</span>
                          Editar
                        </button>
                        <button
                          class="btn btn--sm"
                          [class.btn--danger]="prod.available"
                          [class.btn--success]="!prod.available"
                          (click)="toggleAvailability(prod)"
                        >
                          {{ prod.available ? 'Desactivar' : 'Activar' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal para Crear / Editar Producto -->
      @if (showModal()) {
        <div class="modal-overlay">
          <div class="modal-box">
            <h3 style="margin-bottom: 1.25rem;">
              {{ editingProduct() ? 'Editar Producto' : 'Nuevo Producto' }}
            </h3>

            <form [formGroup]="productForm" (ngSubmit)="saveProduct()">
              <div class="form-group">
                <label>Categoría *</label>
                <select class="form-control" formControlName="categoryId">
                  <option value="">Selecciona una categoría</option>
                  @for (cat of categories(); track cat.id) {
                    <option [value]="cat.id">{{ cat.name }}</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>Nombre del Plato o Bebida *</label>
                <input type="text" class="form-control" formControlName="name" placeholder="Ej. Lomo Saltado Criollo">
              </div>

              <div class="form-group">
                <label>Descripción</label>
                <textarea class="form-control" rows="2" formControlName="description" placeholder="Ingredientes y presentación..."></textarea>
              </div>

              <div class="form-group">
                <label>Precio en Soles (S/) *</label>
                <input type="number" step="0.50" min="0" class="form-control" formControlName="price" placeholder="Ej. 35.00">
              </div>

              <div class="form-group">
                <label>URL de Fotografía</label>
                <input type="url" class="form-control" formControlName="imageUrl" placeholder="https://images.unsplash.com/...">
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
                <button type="button" class="btn btn--secondary" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn--primary" [disabled]="productForm.invalid || saving()">
                  @if (saving()) {
                    <span class="spinner spinner--sm"></span>
                    Guardando...
                  } @else {
                    Guardar Producto
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .products-mgmt-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-box {
      background: white;
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      max-width: 520px;
      width: 100%;
      box-shadow: var(--shadow-xl);
    }
  `]
})
export class ProductsComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly fb = inject(FormBuilder);

  readonly products = signal<Product[]>([]);
  readonly filteredProducts = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly showModal = signal<boolean>(false);
  readonly editingProduct = signal<Product | null>(null);

  searchQuery = '';
  selectedCategory = '';

  readonly productForm = this.fb.group({
    categoryId: ['', Validators.required],
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    price: ['', [Validators.required, Validators.min(0)]],
    imageUrl: [''],
  });

  ngOnInit(): void {
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.loading.set(true);

    this.productsService.getCategories().subscribe({
      next: (res) => { if (res.success) this.categories.set(res.data); }
    });

    this.productsService.getProducts({ limit: 100 }).subscribe({
      next: (res) => {
        if (res.success) {
          this.products.set(res.data);
          this.filteredProducts.set(res.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Error al cargar la lista de productos');
      }
    });
  }

  applyFilters(): void {
    let list = this.products();
    if (this.selectedCategory) {
      list = list.filter((p) => p.categoryId === this.selectedCategory);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    this.filteredProducts.set(list);
  }

  openCreateModal(): void {
    this.editingProduct.set(null);
    this.productForm.reset();
    this.showModal.set(true);
  }

  openEditModal(prod: Product): void {
    this.editingProduct.set(prod);
    this.productForm.setValue({
      categoryId: prod.categoryId,
      name: prod.name,
      description: prod.description ?? '',
      price: prod.price,
      imageUrl: prod.imageUrl ?? '',
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveProduct(): void {
    if (this.productForm.invalid || this.saving()) return;

    this.saving.set(true);
    const formVal = this.productForm.value;
    const prod = this.editingProduct();

    if (prod) {
      this.productsService.updateProduct(prod.id, {
        categoryId: formVal.categoryId!,
        name: formVal.name!,
        description: formVal.description || undefined,
        price: String(formVal.price),
        imageUrl: formVal.imageUrl || undefined,
      }).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.loadCatalog();
        },
        error: (err) => {
          this.saving.set(false);
          alert(err?.error?.message ?? 'Error al actualizar el producto');
        }
      });
    } else {
      this.productsService.createProduct({
        categoryId: formVal.categoryId!,
        name: formVal.name!,
        description: formVal.description || undefined,
        price: String(formVal.price),
        imageUrl: formVal.imageUrl || undefined,
      }).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.loadCatalog();
        },
        error: (err) => {
          this.saving.set(false);
          alert(err?.error?.message ?? 'Error al registrar el producto');
        }
      });
    }
  }

  toggleAvailability(prod: Product): void {
    this.productsService.updateProduct(prod.id, { available: !prod.available }).subscribe({
      next: () => {
        this.loadCatalog();
      },
      error: () => {
        alert('No se pudo modificar la disponibilidad del producto');
      }
    });
  }
}
