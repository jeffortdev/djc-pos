import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
  IonIcon, IonSpinner, IonButton, IonButtons, IonItem, IonLabel, IonInput,
  IonSelect, IonSelectOption, IonToggle, IonRefresher, IonRefresherContent,
  IonBadge, IonSearchbar,
  AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, createOutline, trashOutline, checkmarkOutline, closeOutline,
  addCircleOutline, removeCircleOutline, timeOutline, chevronDownOutline, chevronUpOutline, swapVerticalOutline
} from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
import { BrandingService } from '../../services/branding.service';
import { Product, StockEntry } from '../../models/models';

const PRODUCT_TYPES = ['Dry Goods', 'Cleaning Supplies', 'Detergent', 'Accessories', 'Other'];
const STOCK_REASONS = ['Restock', 'Damaged', 'Correction', 'Returned', 'Other'];

@Component({
  selector: 'app-products-admin',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DatePipe, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
    IonIcon, IonSpinner, IonButton, IonButtons, IonItem, IonLabel, IonInput,
    IonSelect, IonSelectOption, IonToggle, IonRefresher, IonRefresherContent,
    IonBadge, IonSearchbar,
  ],
  providers: [AlertController, ToastController],
  templateUrl: './products-admin.page.html',
  styleUrls: ['./products-admin.page.scss'],
})
export class ProductsAdminPage implements OnInit {
  products: Product[] = [];
  loading = true;
  editing = false;
  isNew = false;
  types = PRODUCT_TYPES;
  stockReasons = STOCK_REASONS;
  form: Partial<Product> = {};
  private editId = 0;
  filterTerm = '';
  sortAsc = true;

  get filteredProducts(): Product[] {
    const term = this.filterTerm.toLowerCase().trim();
    let list = term ? this.products.filter(p => p.name.toLowerCase().includes(term)) : [...this.products];
    list.sort((a, b) => this.sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    return list;
  }

  adjustingId: number | null = null;
  adjustMode: 'add' | 'deduct' = 'add';
  adjustQty = 1;
  adjustReason = STOCK_REASONS[0];
  adjustNote = '';

  expandedHistoryId: number | null = null;
  historyMap: Record<number, StockEntry[]> = {};
  historyLoading = false;

  constructor(
    private api: DatabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    public branding: BrandingService,
  ) {
    addIcons({ addOutline, createOutline, trashOutline, checkmarkOutline, closeOutline,
               addCircleOutline, removeCircleOutline, timeOutline, chevronDownOutline, chevronUpOutline, swapVerticalOutline });
  }

  ngOnInit(): void { this.loadProducts(); }

  loadProducts(): void {
    this.api.getAllProducts().subscribe(products => {
      this.products = products;
      this.loading = false;
    });
  }

  refresh(event: CustomEvent): void {
    this.api.getAllProducts().subscribe(products => {
      this.products = products;
      (event.target as HTMLIonRefresherElement).complete();
    });
  }

  stockColor(stock: number): string {
    return stock <= 0 ? 'danger' : stock <= 5 ? 'warning' : 'success';
  }

  startAdd(): void {
    this.isNew = true;
    this.editing = true;
    this.editId = 0;
    this.adjustingId = null;
    this.expandedHistoryId = null;
    this.form = { name: '', type: this.types[0], cost: 0, price: 0, stock: 0, active: 1 };
  }

  startEdit(product: Product): void {
    this.isNew = false;
    this.editing = true;
    this.editId = product.id;
    this.adjustingId = null;
    this.form = { ...product };
  }

  cancelEdit(): void { this.editing = false; }

  save(): void {
    if (this.isNew) {
      this.api.createProduct(this.form).subscribe({
        next: async (res) => {
          const newItem: Product = {
            id: res.id,
            name: this.form.name!,
            type: this.form.type ?? 'Other',
            cost: this.form.cost ?? 0,
            price: this.form.price ?? 0,
            stock: this.form.stock ?? 0,
            active: this.form.active ? 1 : 0,
            sort_order: this.form.sort_order ?? 0,
          };
          this.products.push(newItem);
          this.editing = false;
          const toast = await this.toastCtrl.create({ message: 'Product added', duration: 2000 });
          await toast.present();
        }
      });
    } else {
      this.api.updateProduct(this.editId, this.form).subscribe({
        next: async () => {
          const idx = this.products.findIndex(p => p.id === this.editId);
          if (idx !== -1) Object.assign(this.products[idx], this.form);
          this.editing = false;
          const toast = await this.toastCtrl.create({ message: 'Product updated', duration: 2000 });
          await toast.present();
        }
      });
    }
  }

  toggleAdjust(product: Product): void {
    if (this.adjustingId === product.id) {
      this.adjustingId = null;
    } else {
      this.adjustingId = product.id;
      this.adjustMode = 'add';
      this.adjustQty = 1;
      this.adjustReason = STOCK_REASONS[0];
      this.adjustNote = '';
      this.editing = false;
    }
  }

  cancelAdjust(): void { this.adjustingId = null; }

  applyAdjust(product: Product): void {
    if (!this.adjustQty || this.adjustQty < 1) return;
    const delta = this.adjustMode === 'add' ? this.adjustQty : -this.adjustQty;
    const reason = this.adjustReason.toLowerCase();
    this.api.adjustProductStock(product.id, delta, reason, this.adjustNote).subscribe(async () => {
      this.adjustingId = null;
      // Refresh product stock in the list
      const updatedProd = this.products.find(p => p.id === product.id);
      if (updatedProd) updatedProd.stock = Math.max(0, updatedProd.stock + delta);
      // Refresh history if it was open
      if (this.expandedHistoryId === product.id) {
        this.loadHistory(product.id);
      }
      const toast = await this.toastCtrl.create({
        message: `Stock ${delta > 0 ? 'added' : 'deducted'}: ${Math.abs(delta)} pcs (${product.name})`,
        duration: 2500,
        color: delta > 0 ? 'success' : 'warning',
      });
      await toast.present();
    });
  }

  toggleHistory(product: Product): void {
    if (this.expandedHistoryId === product.id) {
      this.expandedHistoryId = null;
    } else {
      this.expandedHistoryId = product.id;
      this.loadHistory(product.id);
    }
  }

  private loadHistory(productId: number): void {
    this.historyLoading = true;
    this.api.getStockHistory(productId).subscribe({
      next: entries => {
        this.historyMap[productId] = entries;
        this.historyLoading = false;
      },
      error: () => { this.historyLoading = false; },
    });
  }

  async deleteProduct(product: Product): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete Product',
      message: `Delete "${product.name}"? Stock history will also be removed.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: () => {
            this.api.deleteProduct(product.id).subscribe(async () => {
              this.products = this.products.filter(p => p.id !== product.id);
              const toast = await this.toastCtrl.create({ message: 'Product deleted', duration: 2000 });
              await toast.present();
            });
          }
        }
      ]
    });
    await alert.present();
  }
}
