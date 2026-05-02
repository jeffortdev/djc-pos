import { Component, OnInit, OnDestroy } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol,
  IonCard, IonCardContent, IonButton, IonIcon, IonChip, IonLabel, IonSpinner,
  IonRefresher, IonRefresherContent,
  ModalController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  shirtOutline, waterOutline, flameOutline, sparklesOutline, starOutline,
  checkmarkCircleOutline, removeOutline, addOutline, trashOutline,
  cardOutline, cashOutline, phonePortraitOutline, checkmarkDoneOutline, receiptOutline
} from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
import { LaundryService, Product, CartItem } from '../../models/models';
import { PaymentModalComponent } from './payment-modal/payment-modal.component';
import { ReceiptModalComponent } from './receipt-modal/receipt-modal.component';

const CATEGORY_ICONS: Record<string, string> = {
  wash: 'water-outline',
  dry: 'flame-outline',
  press: 'shirt-outline',
  'dry-clean': 'sparkles-outline',
  special: 'star-outline',
  standard: 'checkmark-circle-outline',
};

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol,
    IonCard, IonCardContent, IonButton, IonIcon, IonChip, IonLabel, IonSpinner,
    IonRefresher, IonRefresherContent,
  ],
  providers: [ModalController, ToastController],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>
          <img src="assets/logo.svg" alt="DJC POS" class="header-logo">
        </ion-title>
        @if (cart.length > 0) {
          <ion-button slot="end" fill="clear" (click)="clearCart()">
            <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
          </ion-button>
        }
      </ion-toolbar>
    </ion-header>

    <ion-content [scrollY]="false">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      @if (loading) {
        <div class="loading-center"><ion-spinner name="crescent"></ion-spinner></div>
      } @else {
        <div class="pos-layout">

          <!-- TOP: Service / Product selector -->
          <div class="services-pane">
            <div class="section-toggle">
              <ion-chip [color]="activeMode === 'services' ? 'primary' : ''" (click)="activeMode = 'services'; activeCategory = ''">
                <ion-label>Services</ion-label>
              </ion-chip>
              <ion-chip [color]="activeMode === 'products' ? 'primary' : ''" (click)="activeMode = 'products'; activeCategory = ''">
                <ion-label>Products</ion-label>
              </ion-chip>
            </div>
            <div class="category-row">
              <ion-chip
                [outline]="activeCategory !== ''"
                [color]="activeCategory === '' ? 'primary' : ''"
                (click)="activeCategory = ''"
              ><ion-label>All</ion-label></ion-chip>
              @for (cat of categories; track cat) {
                <ion-chip
                  [outline]="activeCategory !== cat"
                  [color]="activeCategory === cat ? 'primary' : ''"
                  (click)="activeCategory = cat"
                ><ion-label>{{ cat | titlecase }}</ion-label></ion-chip>
              }
            </div>
            <div class="grid-scroll">
              <ion-grid>
                <ion-row>
                  @for (svc of filtered; track svc.id) {
                    <ion-col size="4" size-md="3">
                      <ion-card class="service-tile" button (click)="addToCart(svc)">
                        <ion-card-content class="tile-content">
                          <ion-icon [name]="iconName(svc)" class="tile-icon" color="primary"></ion-icon>
                          <p class="tile-name">{{ svc.name }}</p>
                          <p class="tile-price">{{ svc.price | currency:'PHP':'symbol':'1.2-2' }}</p>
                          @if (activeMode === 'products') {
                            <p class="tile-stock">Stock: {{ productStock(svc) }}</p>
                          }
                        </ion-card-content>
                      </ion-card>
                    </ion-col>
                  }
                  @empty {
                    <ion-col><p class="empty-msg">No {{ activeMode === 'services' ? 'services' : 'products' }} available.</p></ion-col>
                  }
                </ion-row>
              </ion-grid>
            </div>
          </div>

          <!-- BOTTOM: Cart -->
          <div class="cart-pane">
            <div class="cart-header">
              <span class="cart-title">Order</span>
              <span class="cart-count">{{ cartCount }} item{{ cartCount !== 1 ? 's' : '' }}</span>
            </div>
            <div class="cart-body">
              @if (cart.length === 0) {
                <p class="cart-empty-hint">Tap a service above to add it</p>
              } @else {
                @for (item of cart; track item.service_id) {
                  <div class="cart-item">
                    <span class="ci-name">{{ item.service_name }}</span>
                    <div class="ci-controls">
                      <button class="qty-btn" (click)="decrement(item)">
                        <ion-icon name="remove-outline"></ion-icon>
                      </button>
                      <span class="ci-qty">{{ item.quantity }}</span>
                      <button class="qty-btn" (click)="increment(item)">
                        <ion-icon name="add-outline"></ion-icon>
                      </button>
                    </div>
                    <span class="ci-price">{{ item.price * item.quantity | currency:'PHP':'symbol':'1.2-2' }}</span>
                  </div>
                }
              }
            </div>
            <div class="cart-footer">
              <div class="total-row">
                <span class="total-label">Total</span>
                <strong class="total-amount">{{ cartTotal | currency:'PHP':'symbol':'1.2-2' }}</strong>
              </div>
              <ion-button expand="block" color="primary" [disabled]="cart.length === 0" (click)="charge()">
                <ion-icon name="checkmark-done-outline" slot="start"></ion-icon>
                Charge {{ cartTotal | currency:'PHP':'symbol':'1.2-2' }}
              </ion-button>
            </div>
          </div>

        </div>
      }
    </ion-content>
  `,
  styles: [`
    ion-content { --overflow: hidden; }
    .loading-center { display: flex; justify-content: center; align-items: center; height: 100%; }

    .pos-layout { display: flex; flex-direction: column; height: 100%; }

    /* Services pane */
    .services-pane { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
    .section-toggle { display: flex; gap: 8px; padding: 10px 10px 0; }
    .category-row { flex: 0 0 auto; display: flex; flex-wrap: nowrap; gap: 6px; padding: 8px 10px; overflow-x: auto; }
    .grid-scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    .service-tile { margin: 4px; }
    .tile-content { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 8px 4px; gap: 2px; }
    .tile-icon { font-size: 1.6rem; }
    .tile-name { font-size: 0.75rem; font-weight: 500; margin: 0; line-height: 1.2; }
    .tile-price { font-size: 0.85rem; font-weight: 700; margin: 0; color: var(--ion-color-primary); }
    .tile-stock { font-size: 0.72rem; opacity: 0.6; margin: 0; }
    .empty-msg { text-align: center; opacity: 0.5; padding: 24px; }

    /* Cart pane */
    .cart-pane { flex: 0 0 42vh; min-height: 190px; display: flex; flex-direction: column; border-top: 2px solid var(--ion-color-light); background: var(--ion-background-color); }
    .cart-header { flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 6px 14px; border-bottom: 1px solid var(--ion-color-light); }
    .cart-title { font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; }
    .cart-count { font-size: 0.75rem; opacity: 0.45; }
    .cart-body { flex: 1; overflow-y: auto; padding: 2px 0; }
    .cart-empty-hint { text-align: center; opacity: 0.38; font-size: 0.82rem; padding: 16px; margin: 0; }
    .cart-item { display: flex; align-items: center; padding: 5px 14px; gap: 8px; }
    .ci-name { flex: 1; font-size: 0.83rem; }
    .ci-controls { display: flex; align-items: center; gap: 0; }
    .qty-btn { background: none; border: none; padding: 4px 6px; cursor: pointer; color: var(--ion-color-primary); display: flex; align-items: center; font-size: 1rem; border-radius: 4px; }
    .qty-btn:active { background: var(--ion-color-light); }
    .ci-qty { min-width: 22px; text-align: center; font-weight: 600; font-size: 0.88rem; }
    .ci-price { font-size: 0.82rem; font-weight: 600; min-width: 68px; text-align: right; }
    .cart-footer { flex: 0 0 auto; padding: 6px 12px 8px; border-top: 1px solid var(--ion-color-light); }
    .total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .total-label { font-size: 0.9rem; opacity: 0.65; }
    .total-amount { font-size: 1.2rem; color: var(--ion-color-primary); }
  `],
})
export class PosPage implements OnInit, OnDestroy, ViewWillEnter {
  services: LaundryService[] = [];
  products: Product[] = [];
  cart: CartItem[] = [];
  loading = true;
  activeMode: 'services' | 'products' = 'services';
  activeCategory = '';
  private routerSub?: Subscription;
  private servicesLoaded = false;
  private productsLoaded = false;

  constructor(
    private api: DatabaseService,
    private router: Router,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      shirtOutline, waterOutline, flameOutline, sparklesOutline, starOutline,
      checkmarkCircleOutline, removeOutline, addOutline, trashOutline,
      cardOutline, cashOutline, phonePortraitOutline, checkmarkDoneOutline, receiptOutline
    });
  }

  ngOnInit(): void {
    this.loadCatalog();
    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd && (e as NavigationEnd).urlAfterRedirects === '/pos')
    ).subscribe(() => this.loadCatalog());
  }

  ngOnDestroy(): void { this.routerSub?.unsubscribe(); }

  ionViewWillEnter(): void { this.loadCatalog(); }

  refresh(event: CustomEvent): void {
    this.servicesLoaded = false;
    this.productsLoaded = false;
    this.loadCatalog(() => (event.target as HTMLIonRefresherElement).complete());
  }

  private loadCatalog(done?: () => void): void {
    this.loading = true;
    this.servicesLoaded = false;
    this.productsLoaded = false;

    this.api.getActiveServices().subscribe({
      next: s => {
        this.services = s;
        this.servicesLoaded = true;
        if (this.productsLoaded) {
          this.loading = false;
          done?.();
        }
      },
      error: async () => {
        this.loading = false;
        const toast = await this.toastCtrl.create({
          message: 'Could not load services. Please restart the app.',
          duration: 4000, color: 'warning',
        });
        await toast.present();
        done?.();
      },
    });

    this.api.getActiveProducts().subscribe({
      next: p => {
        this.products = p;
        this.productsLoaded = true;
        if (this.servicesLoaded) {
          this.loading = false;
          done?.();
        }
      },
      error: async () => {
        this.loading = false;
        const toast = await this.toastCtrl.create({
          message: 'Could not load products. Please restart the app.',
          duration: 4000, color: 'warning',
        });
        await toast.present();
        done?.();
      },
    });
  }

  get categories(): string[] {
    if (this.activeMode === 'services') {
      return [...new Set(this.services.map(svc => svc.category))];
    }
    return [...new Set(this.products.map(prod => prod.type))];
  }

  get filtered(): (LaundryService | Product)[] {
    if (this.activeMode === 'services') {
      if (!this.activeCategory) return this.services;
      return this.services.filter(svc => svc.category === this.activeCategory);
    }

    if (!this.activeCategory) return this.products;
    return this.products.filter(prod => prod.type === this.activeCategory);
  }

  get cartCount(): number {
    return this.cart.reduce((s, i) => s + i.quantity, 0);
  }

  get cartTotal(): number {
    return parseFloat(this.cart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2));
  }

  itemCategory(svc: LaundryService | Product): string {
    return this.activeMode === 'services' ? (svc as LaundryService).category : (svc as Product).type;
  }

  iconName(svc: LaundryService | Product): string {
    return this.icon(this.itemCategory(svc));
  }

  productStock(svc: LaundryService | Product): number {
    return this.activeMode === 'products' ? (svc as Product).stock : 0;
  }

  icon(cat: string): string { return CATEGORY_ICONS[cat] ?? 'checkmark-circle-outline'; }

  addToCart(svc: LaundryService | Product): void {
    const existing = this.cart.find(i => i.service_id === svc.id && i.item_type === (this.activeMode === 'services' ? 'service' : 'product'));
    const itemType = this.activeMode === 'services' ? 'service' : 'product';
    const stock = itemType === 'product' ? (svc as Product).stock : Infinity;

    if (existing) {
      if (existing.quantity >= stock) {
        this.toastCtrl.create({ message: 'Not enough stock available.', duration: 2200, color: 'warning' }).then(t => t.present());
        return;
      }
      existing.quantity++;
      this.cart = [...this.cart];
    } else {
      if (stock <= 0) {
        this.toastCtrl.create({ message: 'Product is out of stock.', duration: 2200, color: 'warning' }).then(t => t.present());
        return;
      }
      this.cart = [...this.cart, {
        service_id: svc.id,
        service_name: svc.name,
        unit: this.activeMode === 'services' ? (svc as LaundryService).unit : 'each',
        price: svc.price,
        quantity: 1,
        item_type: itemType,
      }];
    }
  }

  increment(item: CartItem): void {
    if (item.item_type === 'product') {
      const product = this.products.find(p => p.id === item.service_id);
      if (product && item.quantity >= product.stock) {
        this.toastCtrl.create({ message: 'Not enough stock available.', duration: 2200, color: 'warning' }).then(t => t.present());
        return;
      }
    }
    item.quantity++;
    this.cart = [...this.cart];
  }

  decrement(item: CartItem): void {
    if (item.quantity > 1) {
      item.quantity--;
      this.cart = [...this.cart];
    } else {
      this.cart = this.cart.filter(i => !(i.service_id === item.service_id && i.item_type === item.item_type));
    }
  }

  clearCart(): void {
    this.cart = [];
  }

  async charge(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: PaymentModalComponent,
      componentProps: { cart: this.cart },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (!data?.confirmed) return;

    this.api.createTransaction({
      items: this.cart,
      payment_method: data.result.payment_method,
      amount_tendered: data.result.amount_tendered,
      phone_number: data.result.phone_number,
      notes: data.result.notes,
    }).subscribe({
      next: async tx => {
        const productItems = this.cart.filter(i => i.item_type === 'product');
        for (const item of productItems) {
          this.api.adjustProductStock(item.service_id, -item.quantity).subscribe();
        }
        this.cart = [];
        const receiptModal = await this.modalCtrl.create({
          component: ReceiptModalComponent,
          componentProps: { tx },
        });
        await receiptModal.present();
      },
      error: async () => {
        const toast = await this.toastCtrl.create({ message: 'Transaction failed.', duration: 3000, color: 'danger' });
        await toast.present();
      },
    });
  }
}
