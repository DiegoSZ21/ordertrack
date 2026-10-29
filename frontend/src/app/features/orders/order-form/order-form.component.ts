import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductsService } from '../../../core/services/products.service';
import { OrdersService } from '../../../core/services/orders.service';
import { Product, Category } from '../../../core/models/product.model';
import { DeliveryType } from '../../../core/models/order.model';

interface SelectedProductItem {
  product: Product;
  quantity: number;
}

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="order-form-page">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Registrar Nuevo Pedido</h1>
          <p class="page-header__subtitle">Selecciona los productos solicitados por el cliente</p>
        </div>
        <a routerLink="/panel/pedidos" class="btn btn--secondary">
          <span class="material-icons-round">arrow_back</span>
          Volver a pedidos
        </a>
      </div>

      @if (errorMessage()) {
        <div class="alert alert--error" style="margin-bottom: 1.5rem;">
          <span class="material-icons-round">error</span>
          {{ errorMessage() }}
        </div>
      }

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
        <!-- Catálogo de Productos para Agregar -->
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <!-- Barra de Búsqueda y Categorías -->
          <div class="card">
            <div class="card__body" style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <input
                type="text"
                class="form-control"
                style="flex: 1;"
                placeholder="Buscar plato o bebida..."
                [(ngModel)]="searchQuery"
                (ngModelChange)="filterProducts()"
              >
              <select class="form-control" style="width: 200px;" [(ngModel)]="selectedCategory" (ngModelChange)="filterProducts()">
                <option value="">Todas las categorías</option>
                @for (cat of categories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Cuadrícula de Productos -->
          @if (loadingProducts()) {
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem;">
              <div class="card skeleton" style="height: 180px;"></div>
              <div class="card skeleton" style="height: 180px;"></div>
              <div class="card skeleton" style="height: 180px;"></div>
            </div>
          } @else {
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem;">
              @for (prod of filteredProducts(); track prod.id) {
                <div class="card product-card">
                  <div class="product-card__content">
                    <span style="font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase;">
                      {{ prod.category?.name }}
                    </span>
                    <h4 style="font-size: 1rem; margin: 0.25rem 0;">{{ prod.name }}</h4>
                    <p style="font-size: 0.8rem; color: var(--color-text-muted); line-height: 1.3; margin-bottom: 0.75rem;">
                      {{ prod.description || 'Sin descripción' }}
                    </p>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                      <span style="font-weight: 700; color: var(--color-primary); font-size: 1.1rem;">
                        S/ {{ prod.price }}
                      </span>
                      <button class="btn btn--primary btn--sm" (click)="addToCart(prod)">
                        <span class="material-icons-round" style="font-size: 16px;">add</span>
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Resumen del Pedido y Envío -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div class="card">
            <div class="card__header">
              <h3 style="font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
                <span class="material-icons-round" style="color: var(--color-primary);">shopping_cart</span>
                Resumen de Pedido
              </h3>
            </div>
            <div class="card__body" style="display: flex; flex-direction: column; gap: 1.25rem;">
              <!-- Tipo de Entrega -->
              <div class="form-group" style="margin-bottom: 0;">
                <label>Modalidad de Entrega</label>
                <div style="display: flex; gap: 0.5rem;">
                  <button
                    type="button"
                    class="btn btn--full"
                    [class.btn--primary]="deliveryType === 'RECOJO'"
                    [class.btn--secondary]="deliveryType !== 'RECOJO'"
                    (click)="deliveryType = 'RECOJO'"
                  >
                    <span class="material-icons-round">shopping_bag</span>
                    Recojo en Local
                  </button>
                  <button
                    type="button"
                    class="btn btn--full"
                    [class.btn--primary]="deliveryType === 'DELIVERY'"
                    [class.btn--secondary]="deliveryType !== 'DELIVERY'"
                    (click)="deliveryType = 'DELIVERY'"
                  >
                    <span class="material-icons-round">two_wheeler</span>
                    Delivery
                  </button>
                </div>
              </div>

              <!-- Lista de ítems seleccionados -->
              <div style="border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); padding: 1rem 0;">
                @if (cart().length === 0) {
                  <div style="text-align: center; color: var(--color-text-secondary); padding: 1rem;">
                    <span class="material-icons-round" style="font-size: 2rem; color: var(--color-text-muted);">remove_shopping_cart</span>
                    <p style="font-size: 0.85rem; margin-top: 0.25rem;">No has agregado productos al pedido.</p>
                  </div>
                } @else {
                  <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    @for (item of cart(); track item.product.id) {
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                        <div style="flex: 1; min-width: 0;">
                          <div style="font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                            {{ item.product.name }}
                          </div>
                          <div style="color: var(--color-text-secondary);">
                            S/ {{ item.product.price }} c/u
                          </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                          <button class="btn btn--secondary btn--icon" style="padding: 2px 6px;" (click)="decreaseQty(item)">-</button>
                          <span style="font-weight: 700; min-width: 20px; text-align: center;">{{ item.quantity }}</span>
                          <button class="btn btn--secondary btn--icon" style="padding: 2px 6px;" (click)="increaseQty(item)">+</button>
                        </div>

                        <div style="font-weight: 700; width: 65px; text-align: right;">
                          S/ {{ calculateLine(item) }}
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Observaciones -->
              <div class="form-group" style="margin-bottom: 0;">
                <label>Instrucciones u Observaciones</label>
                <textarea
                  class="form-control"
                  rows="2"
                  placeholder="Ej. Sin cebolla, salsas aparte, etc."
                  [(ngModel)]="orderNotes"
                ></textarea>
              </div>

              <!-- Total General -->
              <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem;">
                <span style="font-size: 1.1rem; font-weight: 700;">Total a Pagar:</span>
                <span style="font-size: 1.6rem; font-weight: 800; color: var(--color-primary);">
                  S/ {{ grandTotal() }}
                </span>
              </div>

              <!-- Botón Confirmar -->
              <button
                class="btn btn--primary btn--full btn--lg"
                [disabled]="cart().length === 0 || submitting()"
                (click)="submitOrder()"
              >
                @if (submitting()) {
                  <span class="spinner spinner--sm"></span>
                  Procesando Pedido...
                } @else {
                  <span class="material-icons-round">check</span>
                  Registrar Pedido
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .order-form-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .product-card {
      display: flex;
      flex-direction: column;
      height: 100%;

      &__content {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        flex: 1;
      }
    }
  `]
})
export class OrderFormComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly ordersService = inject(OrdersService);
  private readonly router = inject(Router);

  readonly products = signal<Product[]>([]);
  readonly filteredProducts = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly cart = signal<SelectedProductItem[]>([]);
  readonly loadingProducts = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  searchQuery = '';
  selectedCategory = '';
  deliveryType: DeliveryType = 'RECOJO';
  orderNotes = '';

  readonly grandTotal = computed(() => {
    const total = this.cart().reduce((acc, item) => {
      return acc + (Number(item.product.price) * item.quantity);
    }, 0);
    return total.toFixed(2);
  });

  ngOnInit(): void {
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.loadingProducts.set(true);

    this.productsService.getCategories().subscribe({
      next: (res) => {
        if (res.success) {
          this.categories.set(res.data);
        }
      }
    });

    this.productsService.getProducts({ available: true, limit: 100 }).subscribe({
      next: (res) => {
        if (res.success) {
          this.products.set(res.data);
          this.filteredProducts.set(res.data);
        }
        this.loadingProducts.set(false);
      },
      error: () => {
        this.loadingProducts.set(false);
        this.errorMessage.set('Error al cargar la lista de productos');
      }
    });
  }

  filterProducts(): void {
    let list = this.products();
    if (this.selectedCategory) {
      list = list.filter((p) => p.categoryId === this.selectedCategory);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q)));
    }
    this.filteredProducts.set(list);
  }

  addToCart(product: Product): void {
    const current = [...this.cart()];
    const index = current.findIndex((i) => i.product.id === product.id);
    if (index >= 0) {
      current[index].quantity += 1;
    } else {
      current.push({ product, quantity: 1 });
    }
    this.cart.set(current);
  }

  increaseQty(item: SelectedProductItem): void {
    const current = [...this.cart()];
    const index = current.findIndex((i) => i.product.id === item.product.id);
    if (index >= 0) {
      current[index].quantity += 1;
      this.cart.set(current);
    }
  }

  decreaseQty(item: SelectedProductItem): void {
    const current = [...this.cart()];
    const index = current.findIndex((i) => i.product.id === item.product.id);
    if (index >= 0) {
      if (current[index].quantity > 1) {
        current[index].quantity -= 1;
      } else {
        current.splice(index, 1);
      }
      this.cart.set(current);
    }
  }

  calculateLine(item: SelectedProductItem): string {
    return (Number(item.product.price) * item.quantity).toFixed(2);
  }

  submitOrder(): void {
    if (this.cart().length === 0 || this.submitting()) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    const payload = {
      deliveryType: this.deliveryType,
      notes: this.orderNotes.trim() || undefined,
      items: this.cart().map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    };

    this.ordersService.createOrder(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.success && res.data) {
          this.router.navigate(['/panel/pedidos', res.data.id]);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'No se pudo crear el pedido');
      }
    });
  }
}

