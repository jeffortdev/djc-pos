import { Component, OnInit, OnDestroy } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol,
  IonCard, IonCardContent, IonButton, IonButtons, IonIcon, IonChip, IonLabel, IonSpinner,
  IonRefresher, IonRefresherContent, IonBadge, IonSearchbar,
  ModalController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  shirtOutline, waterOutline, flameOutline, sparklesOutline, starOutline,
  checkmarkCircleOutline, removeOutline, addOutline, trashOutline,
  cardOutline, cashOutline, phonePortraitOutline, checkmarkDoneOutline, receiptOutline,
  cartOutline, closeOutline, swapVerticalOutline
} from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
import { BrandingService } from '../../services/branding.service';
import { LaundryService, Product, CartItem, Transaction } from '../../models/models';
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
    IonCard, IonCardContent, IonButton, IonButtons, IonIcon, IonChip, IonLabel, IonSpinner,
    IonRefresher, IonRefresherContent, IonBadge, IonSearchbar,
  ],
  providers: [ModalController, ToastController],
  templateUrl: './pos.page.html',
  styleUrls: ['./pos.page.scss'],
})
export class PosPage implements OnInit, OnDestroy, ViewWillEnter {
  services: LaundryService[] = [];
  products: Product[] = [];
  cart: CartItem[] = [];
  editTx: Transaction | null = null;
  loading = true;
  activeMode: 'services' | 'products' = 'services';
  activeCategory = '';
  filterTerm = '';
  sortAsc = true;
  showCart = false;
  private routerSub?: Subscription;
  private servicesLoaded = false;
  private productsLoaded = false;

  constructor(
    private api: DatabaseService,
    private router: Router,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    public branding: BrandingService,
  ) {
    addIcons({
      shirtOutline, waterOutline, flameOutline, sparklesOutline, starOutline,
      checkmarkCircleOutline, removeOutline, addOutline, trashOutline,
      cardOutline, cashOutline, phonePortraitOutline, checkmarkDoneOutline, receiptOutline,
      cartOutline, closeOutline, swapVerticalOutline
    });
  }

  ngOnInit(): void {
    this.loadCatalog();
    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd && (e as NavigationEnd).urlAfterRedirects === '/pos')
    ).subscribe(() => this.loadCatalog());
  }

  ngOnDestroy(): void { this.routerSub?.unsubscribe(); }

  ionViewWillEnter(): void {
    const state = history.state as { editTx?: Transaction };
    if (state?.editTx) {
      this.editTx = state.editTx;
      this.cart = (state.editTx.items ?? []).map(i => ({
        service_id: i.service_id,
        service_name: i.service_name,
        unit: i.unit,
        price: i.price,
        quantity: i.quantity,
        item_type: i.item_type,
      }));
      this.showCart = true;
      history.replaceState({ ...history.state, editTx: null }, '');
    }
    this.loadCatalog();
  }

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
    const term = this.filterTerm.toLowerCase().trim();
    const sort = (arr: (LaundryService | Product)[]) =>
      [...arr].sort((a, b) =>
        this.sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      );
    let list: (LaundryService | Product)[];
    if (this.activeMode === 'services') {
      list = this.activeCategory
        ? this.services.filter(svc => svc.category === this.activeCategory)
        : this.services;
    } else {
      list = this.activeCategory
        ? this.products.filter(prod => prod.type === this.activeCategory)
        : this.products;
    }
    if (term) list = list.filter(i => i.name.toLowerCase().includes(term));
    return sort(list);
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
    this.showCart = false;
  }

  toggleCart(): void {
    this.showCart = !this.showCart;
  }

  async charge(): Promise<void> {
    this.showCart = false;
    const modal = await this.modalCtrl.create({
      component: PaymentModalComponent,
      componentProps: {
        cart: this.cart,
        allowPayLater: !this.editTx,
        prefillCustomerName: this.editTx?.customer_name ?? '',
        prefillPhone: this.editTx?.phone_number ?? '',
        prefillPersonel: this.editTx?.personel ?? '',
      },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (!data?.confirmed) return;

    if (this.editTx) {
      const editId = this.editTx.id;
      this.api.updateTransactionItems(editId, this.cart).subscribe({
        next: () => {
          this.api.acceptPayment(editId, {
            payment_method: data.result.payment_method,
            amount_tendered: data.result.amount_tendered,
            change_due: data.result.change_due,
          }).subscribe(async paidTx => {
            this.editTx = null;
            this.cart = [];
            const receiptModal = await this.modalCtrl.create({
              component: ReceiptModalComponent,
              componentProps: { tx: paidTx },
            });
            await receiptModal.present();
            this.router.navigate(['/transactions']);
          });
        },
        error: async () => {
          const toast = await this.toastCtrl.create({ message: 'Failed to update order.', duration: 3000, color: 'danger' });
          await toast.present();
        },
      });
      return;
    }

    this.api.createTransaction({
      items: this.cart,
      payment_method: data.payLater ? 'unpaid' : data.result.payment_method,
      amount_tendered: data.payLater ? 0 : data.result.amount_tendered,
      customer_name: data.result.customer_name,
      phone_number: data.result.phone_number,
      notes: data.result.notes,
      personel: data.result.personel,
      status: data.payLater ? 'pending' : 'paid',
    }).subscribe({
      next: async tx => {
        // Always decrement stock for product items (reserved on order registration)
        const productItems = this.cart.filter(i => i.item_type === 'product');
        for (const item of productItems) {
          this.api.adjustProductStock(item.service_id, -item.quantity, 'sale').subscribe();
        }
        this.cart = [];

        if (data.payLater) {
          const toast = await this.toastCtrl.create({
            message: `Order #${tx.id} registered. Payment due on pickup.`,
            duration: 3500,
            color: 'warning',
          });
          await toast.present();
        } else {
          const receiptModal = await this.modalCtrl.create({
            component: ReceiptModalComponent,
            componentProps: { tx },
          });
          await receiptModal.present();
        }
      },
      error: async () => {
        const toast = await this.toastCtrl.create({ message: 'Transaction failed.', duration: 3000, color: 'danger' });
        await toast.present();
      },
    });
  }

  async saveEdits(): Promise<void> {
    if (!this.editTx) return;
    const editId = this.editTx.id;
    this.api.updateTransactionItems(editId, this.cart).subscribe({
      next: async () => {
        const toast = await this.toastCtrl.create({
          message: `Order #${editId} updated.`,
          duration: 2500,
          color: 'success',
        });
        await toast.present();
        this.editTx = null;
        this.cart = [];
        this.router.navigate(['/transactions']);
      },
      error: async () => {
        const toast = await this.toastCtrl.create({ message: 'Failed to update order.', duration: 3000, color: 'danger' });
        await toast.present();
      },
    });
  }

  cancelEdit(): void {
    this.editTx = null;
    this.cart = [];
    this.showCart = false;
    this.router.navigate(['/transactions']);
  }
}
