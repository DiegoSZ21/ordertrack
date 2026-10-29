import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductsService } from '../../core/services/products.service';
import { OrdersService } from '../../core/services/orders.service';
import { AuthService } from '../../core/services/auth.service';
import { Product, Category, CartItem } from '../../core/models/product.model';
import { DeliveryType } from '../../core/models/order.model';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="menu-page">
      <!-- Barra Superior / Header del Menú -->
      <header class="menu-header">
        <div class="menu-header__inner">
          <div class="brand">
            <div class="brand__icon">
              <span class="material-icons-round">restaurant_menu</span>
            </div>
            <div>
              <h1 class="brand__title">El Sabor Peruano</h1>
              <p class="brand__subtitle">Tradición y sabor criollo directo a tu mesa</p>
            </div>
          </div>

          <div class="header-actions">
            @if (authService.isLoggedIn) {
              <div class="user-pill">
                <span class="material-icons-round">account_circle</span>
                <span>{{ authService.currentUser?.name }}</span>
              </div>
              <a routerLink="/panel" class="btn btn--secondary btn--sm">Mi Panel</a>
              <button class="btn btn--ghost btn--sm" (click)="authService.logout()">Cerrar sesión</button>
            } @else {
              <a routerLink="/login" class="btn btn--primary btn--sm">Iniciar sesión</a>
            }

            <!-- Botón toggle carrito flotante (móvil) -->
            <button class="btn btn--primary cart-toggle show-mobile" (click)="showCartMobile = !showCartMobile">
              <span class="material-icons-round">shopping_bag</span>
              <span class="cart-toggle__badge">{{ totalItems() }}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Contenedor Principal: Menú + Carrito -->
      <div class="menu-content">
        <!-- Columna Izquierda: Menú y Catálogo -->
        <div class="catalog-section">
          <!-- Búsqueda y Filtros de Categoría -->
          <div class="filters-bar">
            <div class="search-box">
              <span class="material-icons-round search-box__icon">search</span>
              <input
                type="text"
                class="form-control"
                placeholder="Buscar lomo saltado, ceviche, bebidas..."
                [(ngModel)]="searchQuery"
                (ngModelChange)="applyFilters()"
              >
            </div>

            <!-- Pestañas horizontales de Categorías -->
            <div class="category-tabs">
              <button
                class="category-tab"
                [class.category-tab--active]="selectedCategory === ''"
                (click)="setCategory('')"
              >
                Todos
              </button>
              @for (cat of categories(); track cat.id) {
                <button
                  class="category-tab"
                  [class.category-tab--active]="selectedCategory === cat.id"
                  (click)="setCategory(cat.id)"
                >
                  {{ cat.name }}
                </button>
              }
            </div>
          </div>

          @if (errorMessage()) {
            <div class="alert alert--error" style="margin-bottom: 1rem;">
              <span class="material-icons-round">error</span>
              {{ errorMessage() }}
            </div>
          }

          <!-- Grid de Platos -->
          @if (loading()) {
            <div class="products-grid">
              <div class="card skeleton" style="height: 280px;"></div>
              <div class="card skeleton" style="height: 280px;"></div>
              <div class="card skeleton" style="height: 280px;"></div>
            </div>
          } @else if (filteredProducts().length === 0) {
            <div class="empty-state">
              <span class="material-icons-round">restaurant</span>
              <h3>No encontramos platos</h3>
              <p>Prueba buscando con otros términos o seleccionando otra categoría.</p>
            </div>
          } @else {
            <div class="products-grid">
              @for (prod of filteredProducts(); track prod.id) {
                <div class="product-item card">
                  <div class="product-item__image-wrap">
                    @if (prod.imageUrl) {
                      <img [src]="prod.imageUrl" [alt]="prod.name" class="product-item__img" loading="lazy">
                    } @else {
                      <div class="product-item__placeholder">
                        <span class="material-icons-round">dinner_dining</span>
                      </div>
                    }
                    @if (!prod.available) {
                      <span class="product-item__badge-agotado">Agotado</span>
                    }
                  </div>

                  <div class="product-item__info">
                    <span class="product-item__category">{{ prod.category?.name }}</span>
                    <h3 class="product-item__name">{{ prod.name }}</h3>
                    <p class="product-item__desc">{{ prod.description }}</p>

                    <div class="product-item__bottom">
                      <div class="product-item__price">
                        <span class="currency">S/</span>
                        <span class="amount">{{ prod.price }}</span>
                      </div>

                      <button
                        class="btn btn--primary btn--sm"
                        [disabled]="!prod.available"
                        (click)="addToCart(prod)"
                      >
                        <span class="material-icons-round" style="font-size: 16px;">add_shopping_cart</span>
                        Pedir
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Columna Derecha: Carrito Lateral Flotante -->
        <aside class="cart-sidebar" [class.cart-sidebar--open]="showCartMobile">
          <div class="card cart-card">
            <div class="card__header cart-card__header">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="material-icons-round" style="color: var(--color-primary);">shopping_basket</span>
                <h3 style="font-size: 1.1rem; margin: 0;">Tu Pedido</h3>
              </div>
              <span class="status-badge status-badge--CONFIRMADO">{{ totalItems() }} ítems</span>
              <button class="btn btn--ghost btn--icon show-mobile" (click)="showCartMobile = false">
                <span class="material-icons-round">close</span>
              </button>
            </div>

            <div class="card__body cart-card__body">
              <!-- Modalidad de entrega -->
              <div class="delivery-toggle">
                <button
                  type="button"
                  class="delivery-toggle__btn"
                  [class.delivery-toggle__btn--active]="deliveryType === 'RECOJO'"
                  (click)="deliveryType = 'RECOJO'"
                >
                  <span class="material-icons-round">shopping_bag</span>
                  Para Llevar
                </button>
                <button
                  type="button"
                  class="delivery-toggle__btn"
                  [class.delivery-toggle__btn--active]="deliveryType === 'DELIVERY'"
                  (click)="deliveryType = 'DELIVERY'"
                >
                  <span class="material-icons-round">two_wheeler</span>
                  Delivery
                </button>
              </div>

              <!-- Lista de Ítems en Carrito -->
              <div class="cart-items-list">
                @if (cart().length === 0) {
                  <div class="cart-empty">
                    <span class="material-icons-round" style="font-size: 3rem; color: var(--color-text-muted);">lunch_dining</span>
                    <p style="margin: 0.5rem 0 0; color: var(--color-text-secondary); font-size: 0.9rem;">
                      Tu carrito está vacío.<br>Selecciona tus platos favoritos del menú.
                    </p>
                  </div>
                } @else {
                  @for (item of cart(); track item.product.id) {
                    <div class="cart-row">
                      <div class="cart-row__details">
                        <span class="cart-row__title">{{ item.product.name }}</span>
                        <span class="cart-row__unit-price">S/ {{ item.product.price }} c/u</span>
                      </div>

                      <div class="cart-row__controls">
                        <button class="qty-btn" (click)="decreaseQty(item)">-</button>
                        <span class="qty-value">{{ item.quantity }}</span>
                        <button class="qty-btn" (click)="increaseQty(item)">+</button>
                      </div>

                      <div class="cart-row__subtotal">
                        S/ {{ calculateLine(item) }}
                      </div>
                    </div>
                  }
                }
              </div>

              <!-- Notas / Observaciones -->
              @if (cart().length > 0) {
                <div class="form-group" style="margin-bottom: 0;">
                  <label style="font-size: 0.75rem;">Indicaciones para tu orden</label>
                  <textarea
                    class="form-control"
                    rows="2"
                    placeholder="Ej. Sin picante, cubiertos extra, cambio para S/ 100..."
                    [(ngModel)]="orderNotes"
                  ></textarea>
                </div>
              }
            </div>

            <!-- Footer con totales y botón confirmar -->
            @if (cart().length > 0) {
              <div class="card__footer cart-card__footer">
                <div class="totals-row">
                  <span>Subtotal</span>
                  <span>S/ {{ grandTotal() }}</span>
                </div>
                <div class="totals-row totals-row--grand">
                  <span>Total</span>
                  <span>S/ {{ grandTotal() }}</span>
                </div>

                <button
                  class="btn btn--primary btn--full btn--lg"
                  [disabled]="submitting()"
                  (click)="confirmOrder()"
                >
                  @if (submitting()) {
                    <span class="spinner spinner--sm"></span>
                    Generando Orden...
                  } @else {
                    <span class="material-icons-round">check_circle</span>
                    Confirmar Pedido
                  }
                </button>
              </div>
            }
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .menu-page {
      min-height: 100vh;
      background: var(--color-bg);
      display: flex;
      flex-direction: column;
    }

    .menu-header {
      background: white;
      border-bottom: 1px solid var(--color-border);
      position: sticky;
      top: 0;
      z-index: 40;

      &__inner {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0.75rem 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      &__icon {
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, var(--color-primary), #1D4ED8);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        .material-icons-round { font-size: 1.5rem; }
      }

      &__title {
        font-size: 1.25rem;
        font-weight: 800;
        margin: 0;
        color: var(--color-text);
      }

      &__subtitle {
        font-size: 0.75rem;
        color: var(--color-text-secondary);
        margin: 0;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-pill {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-text);
      background: var(--color-bg);
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      border: 1px solid var(--color-border);
    }

    .menu-content {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.5rem;
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 2rem;
      width: 100%;
      flex: 1;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }

    .filters-bar {
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .search-box {
      position: relative;

      &__icon {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--color-text-muted);
      }

      .form-control {
        padding-left: 2.5rem;
        height: 44px;
        border-radius: var(--radius-lg);
      }
    }

    .category-tabs {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;

      &::-webkit-scrollbar { height: 4px; }
    }

    .category-tab {
      background: white;
      border: 1px solid var(--color-border);
      border-radius: 9999px;
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      cursor: pointer;
      white-space: nowrap;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-bg);
        color: var(--color-text);
      }

      &--active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: white;
        font-weight: 600;
      }
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.5rem;
    }

    .product-item {
      display: flex;
      flex-direction: column;
      transition: transform var(--transition-base), box-shadow var(--transition-base);

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      &__image-wrap {
        height: 180px;
        background: #E2E8F0;
        position: relative;
        overflow: hidden;
      }

      &__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      &__placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-muted);
        .material-icons-round { font-size: 3rem; }
      }

      &__badge-agotado {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        background: rgba(220, 38, 38, 0.9);
        color: white;
        padding: 0.25rem 0.5rem;
        font-size: 0.7rem;
        font-weight: 700;
        border-radius: 4px;
        text-transform: uppercase;
      }

      &__info {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      &__category {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--color-primary);
        letter-spacing: 0.05em;
      }

      &__name {
        font-size: 1.05rem;
        font-weight: 700;
        margin: 0.25rem 0 0.5rem;
        color: var(--color-text);
      }

      &__desc {
        font-size: 0.8rem;
        color: var(--color-text-secondary);
        line-height: 1.4;
        margin-bottom: 1.25rem;
        flex: 1;
      }

      &__bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: auto;
      }

      &__price {
        .currency {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text);
          margin-right: 2px;
        }
        .amount {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--color-text);
        }
      }
    }

    .cart-sidebar {
      position: sticky;
      top: 80px;
      height: fit-content;

      @media (max-width: 1024px) {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        top: auto;
        z-index: 100;
        display: none;

        &--open {
          display: block;
        }
      }
    }

    .cart-card {
      box-shadow: var(--shadow-lg);

      &__body {
        max-height: 55vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
    }

    .delivery-toggle {
      display: flex;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 3px;
      gap: 3px;

      &__btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        padding: 0.4rem;
        border: none;
        background: transparent;
        border-radius: var(--radius-sm);
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer;

        &--active {
          background: white;
          color: var(--color-primary);
          box-shadow: var(--shadow-sm);
        }
      }
    }

    .cart-items-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .cart-empty {
      text-align: center;
      padding: 2rem 1rem;
    }

    .cart-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      font-size: 0.85rem;
      border-bottom: 1px solid var(--color-border-light);
      padding-bottom: 0.6rem;

      &__details {
        flex: 1;
        min-width: 0;
      }

      &__title {
        display: block;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &__unit-price {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }

      &__controls {
        display: flex;
        align-items: center;
        gap: 0.3rem;
      }

      &__subtotal {
        font-weight: 700;
        min-width: 60px;
        text-align: right;
      }
    }

    .qty-btn {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      border: 1px solid var(--color-border);
      background: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      &:hover { background: var(--color-bg); }
    }

    .qty-value {
      font-weight: 700;
      min-width: 18px;
      text-align: center;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      margin-bottom: 0.5rem;

      &--grand {
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--color-text);
        border-top: 1px solid var(--color-border);
        padding-top: 0.5rem;
        margin-bottom: 1rem;
      }
    }

    .cart-toggle {
      position: relative;
      &__badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: var(--color-error);
        color: white;
        font-size: 0.65rem;
        font-weight: 700;
        border-radius: 9999px;
        padding: 0 4px;
      }
    }
  `]
})
export class MenuComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly ordersService = inject(OrdersService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly products = signal<Product[]>([]);
  readonly filteredProducts = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly cart = signal<CartItem[]>([]);
  readonly loading = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  searchQuery = '';
  selectedCategory = '';
  deliveryType: DeliveryType = 'RECOJO';
  orderNotes = '';
  showCartMobile = false;

  readonly totalItems = computed(() => {
    return this.cart().reduce((acc, item) => acc + item.quantity, 0);
  });

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
    this.loading.set(true);

    this.productsService.getCategories().subscribe({
      next: (res) => {
        if (res.success) this.categories.set(res.data);
      }
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
        this.errorMessage.set('Error al cargar la carta');
      }
    });
  }

  setCategory(catId: string): void {
    this.selectedCategory = catId;
    this.applyFilters();
  }

  applyFilters(): void {
    let list = this.products();
    if (this.selectedCategory) {
      list = list.filter((p) => p.categoryId === this.selectedCategory);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q))
      );
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

  increaseQty(item: CartItem): void {
    const current = [...this.cart()];
    const index = current.findIndex((i) => i.product.id === item.product.id);
    if (index >= 0) {
      current[index].quantity += 1;
      this.cart.set(current);
    }
  }

  decreaseQty(item: CartItem): void {
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

  calculateLine(item: CartItem): string {
    return (Number(item.product.price) * item.quantity).toFixed(2);
  }

  confirmOrder(): void {
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.cart().length === 0 || this.submitting()) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    const payload = {
      deliveryType: this.deliveryType,
      notes: this.orderNotes.trim() || undefined,
      items: this.cart().map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      })),
    };

    this.ordersService.createOrder(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.success && res.data) {
          this.cart.set([]);
          this.router.navigate(['/seguimiento', res.data.id]);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'No se pudo procesar tu pedido');
      }
    });
  }
}

