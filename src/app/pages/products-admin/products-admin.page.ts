import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
  IonIcon, IonSpinner, IonButton, IonButtons, IonItem, IonLabel, IonInput,
  IonSelect, IonSelectOption, IonToggle, IonRefresher, IonRefresherContent,
  IonBadge,
  AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, createOutline, trashOutline, checkmarkOutline, closeOutline,
  addCircleOutline, removeCircleOutline, timeOutline, chevronDownOutline, chevronUpOutline
} from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
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
    IonBadge,
  ],
  providers: [AlertController, ToastController],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>
          <img src="assets/logo.svg" alt="DJC Point of Sale" class="header-logo">
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="startAdd()">
            <ion-icon name="add-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (loading) {
        <div class="loading-center">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
      }

      <!-- Add / Edit form -->
      @if (editing) {
        <ion-card class="edit-card">
          <ion-card-content>
            <h2 class="form-heading">{{ isNew ? 'New Product' : 'Edit Product' }}</h2>
            <ion-item>
              <ion-label position="stacked">Name *</ion-label>
              <ion-input [(ngModel)]="form.name" placeholder="Product name"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Type</ion-label>
              <ion-select [(ngModel)]="form.type" interface="action-sheet">
                @for (type of types; track type) {
                  <ion-select-option [value]="type">{{ type }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Cost *</ion-label>
              <ion-input type="number" min="0" step="0.01" [(ngModel)]="form.cost" placeholder="0.00"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Price *</ion-label>
              <ion-input type="number" min="0" step="0.01" [(ngModel)]="form.price" placeholder="0.00"></ion-input>
            </ion-item>
            @if (isNew) {
              <ion-item>
                <ion-label position="stacked">Opening Stock</ion-label>
                <ion-input type="number" min="0" step="1" [(ngModel)]="form.stock" placeholder="0"></ion-input>
              </ion-item>
            }
            <ion-item>
              <ion-label>Active</ion-label>
              <ion-toggle [(ngModel)]="form.active"></ion-toggle>
            </ion-item>
            <div class="form-actions">
              <ion-button fill="outline" (click)="cancelEdit()">
                <ion-icon name="close-outline" slot="start"></ion-icon>
                Cancel
              </ion-button>
              <ion-button [disabled]="!form.name || form.price === undefined || form.cost === undefined" (click)="save()">
                <ion-icon name="checkmark-outline" slot="start"></ion-icon>
                Save
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      }

      <div class="product-list">
        @for (product of products; track product.id) {
          <ion-card class="prod-card">
            <ion-card-content>

              <!-- Main product row -->
              <div class="prod-row">
                <div class="prod-info">
                  <span class="prod-name">{{ product.name }}</span>
                  <span class="prod-meta">{{ product.type }}</span>
                </div>
                <div class="prod-right">
                  <ion-badge [color]="stockColor(product.stock)" class="stock-badge">{{ product.stock }} pcs</ion-badge>
                  <span class="prod-price">{{ product.price | currency:'PHP':'symbol':'1.2-2' }}</span>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="prod-actions">
                <ion-button fill="clear" size="small" (click)="toggleAdjust(product)">
                  <ion-icon name="add-circle-outline" slot="start"></ion-icon>
                  Adjust
                </ion-button>
                <ion-button fill="clear" size="small" (click)="toggleHistory(product)">
                  <ion-icon name="time-outline" slot="start"></ion-icon>
                  History
                </ion-button>
                <ion-button fill="clear" size="small" (click)="startEdit(product)">
                  <ion-icon name="create-outline" slot="icon-only"></ion-icon>
                </ion-button>
                <ion-button fill="clear" size="small" color="danger" (click)="deleteProduct(product)">
                  <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                </ion-button>
              </div>

              <!-- Inline stock adjustment panel -->
              @if (adjustingId === product.id) {
                <div class="adjust-panel">
                  <div class="adjust-mode-row">
                    <button class="mode-btn" [class.add]="adjustMode === 'add'" (click)="adjustMode = 'add'">
                      <ion-icon name="add-circle-outline"></ion-icon> Add
                    </button>
                    <button class="mode-btn" [class.deduct]="adjustMode === 'deduct'" (click)="adjustMode = 'deduct'">
                      <ion-icon name="remove-circle-outline"></ion-icon> Deduct
                    </button>
                  </div>
                  <div class="adjust-fields">
                    <div class="adjust-field">
                      <label>Qty</label>
                      <input type="number" min="1" step="1" [(ngModel)]="adjustQty" class="adj-input">
                    </div>
                    <div class="adjust-field">
                      <label>Reason</label>
                      <select [(ngModel)]="adjustReason" class="adj-select">
                        @for (r of stockReasons; track r) {
                          <option [value]="r">{{ r }}</option>
                        }
                      </select>
                    </div>
                  </div>
                  <div class="adjust-field full-width">
                    <label>Note (optional)</label>
                    <input type="text" [(ngModel)]="adjustNote" placeholder="e.g. bought from supplier" class="adj-input">
                  </div>
                  <div class="adjust-actions">
                    <ion-button fill="outline" size="small" (click)="cancelAdjust()">Cancel</ion-button>
                    <ion-button size="small" [color]="adjustMode === 'add' ? 'success' : 'danger'"
                      [disabled]="!adjustQty || adjustQty < 1"
                      (click)="applyAdjust(product)">
                      {{ adjustMode === 'add' ? '+ Add' : '− Deduct' }} {{ adjustQty }} pcs
                    </ion-button>
                  </div>
                </div>
              }

              <!-- Inline history panel -->
              @if (expandedHistoryId === product.id) {
                <div class="history-panel">
                  <div class="history-header">Stock History</div>
                  @if (historyLoading) {
                    <div class="hist-loading"><ion-spinner name="dots"></ion-spinner></div>
                  } @else if ((historyMap[product.id] || []).length === 0) {
                    <p class="hist-empty">No history yet.</p>
                  } @else {
                    <div class="hist-table">
                      <div class="hist-row hist-head">
                        <span>Date</span>
                        <span>Change</span>
                        <span>Stock</span>
                        <span>Reason</span>
                      </div>
                      @for (entry of historyMap[product.id]; track entry.id) {
                        <div class="hist-row">
                          <span class="hist-date">{{ entry.created_at | date:'MM/dd HH:mm' }}</span>
                          <span class="hist-delta" [class.pos]="entry.delta > 0" [class.neg]="entry.delta < 0">
                            {{ entry.delta > 0 ? '+' : '' }}{{ entry.delta }}
                          </span>
                          <span class="hist-after">{{ entry.stock_after }}</span>
                          <span class="hist-reason">{{ entry.reason }}{{ entry.note ? ' — ' + entry.note : '' }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }

            </ion-card-content>
          </ion-card>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .loading-center { display: flex; justify-content: center; align-items: center; height: 60vh; }
    .edit-card { margin: 8px; }
    .form-heading { font-size: 1rem; font-weight: 600; margin: 0 0 8px; }
    .form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }

    .product-list { padding: 8px; display: flex; flex-direction: column; gap: 8px; }
    .prod-card ion-card-content { padding: 10px 12px; }
    .prod-row { display: flex; align-items: flex-start; gap: 8px; }
    .prod-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .prod-name { font-weight: 600; font-size: 0.92rem; }
    .prod-meta { font-size: 0.74rem; opacity: 0.55; }
    .prod-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .stock-badge { font-size: 0.75rem; }
    .prod-price { font-weight: 700; color: var(--ion-color-primary); white-space: nowrap; font-size: 0.9rem; }
    .prod-actions { display: flex; align-items: center; margin-top: 8px; gap: 0; border-top: 1px solid var(--ion-border-color); padding-top: 6px; }
    .prod-actions ion-button { flex: 1; font-size: 0.78rem; }

    /* Adjust panel */
    .adjust-panel { background: var(--ion-color-light); border-radius: 10px; padding: 10px 12px; margin-top: 10px; }
    .adjust-mode-row { display: flex; gap: 8px; margin-bottom: 10px; }
    .mode-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 8px; border-radius: 8px; border: 2px solid transparent; background: rgba(var(--ion-color-medium-rgb),0.15); font-size: 0.85rem; cursor: pointer; color: var(--ion-text-color); }
    .mode-btn.add    { border-color: var(--ion-color-success); color: var(--ion-color-success); background: rgba(var(--ion-color-success-rgb),0.12); }
    .mode-btn.deduct { border-color: var(--ion-color-danger);  color: var(--ion-color-danger);  background: rgba(var(--ion-color-danger-rgb),0.12); }
    .adjust-fields { display: flex; gap: 10px; margin-bottom: 8px; }
    .adjust-field { display: flex; flex-direction: column; gap: 3px; flex: 1; }
    .adjust-field.full-width { flex: unset; width: 100%; margin-bottom: 8px; }
    .adjust-field label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; }
    .adj-input, .adj-select { border: 1px solid var(--ion-color-medium); border-radius: 6px; padding: 6px 8px; font-size: 0.88rem; background: var(--ion-background-color); color: var(--ion-text-color); width: 100%; }
    .adjust-actions { display: flex; gap: 8px; justify-content: flex-end; }

    /* History panel */
    .history-panel { margin-top: 10px; border-top: 1px solid var(--ion-border-color); padding-top: 8px; }
    .history-header { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.55; margin-bottom: 6px; }
    .hist-loading { display: flex; justify-content: center; padding: 8px; }
    .hist-empty { font-size: 0.8rem; opacity: 0.5; text-align: center; padding: 8px; }
    .hist-table { display: flex; flex-direction: column; gap: 0; }
    .hist-row { display: grid; grid-template-columns: 90px 44px 44px 1fr; gap: 6px; align-items: center; padding: 5px 0; border-bottom: 1px solid rgba(var(--ion-color-medium-rgb),0.15); font-size: 0.8rem; }
    .hist-head { font-weight: 700; font-size: 0.68rem; text-transform: uppercase; opacity: 0.55; border-bottom: 1px solid var(--ion-color-medium); }
    .hist-date { opacity: 0.7; white-space: nowrap; }
    .hist-delta { font-weight: 700; text-align: center; }
    .hist-delta.pos { color: var(--ion-color-success); }
    .hist-delta.neg { color: var(--ion-color-danger); }
    .hist-after { text-align: center; font-weight: 600; }
    .hist-reason { font-size: 0.76rem; opacity: 0.8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `],
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
  ) {
    addIcons({ addOutline, createOutline, trashOutline, checkmarkOutline, closeOutline,
               addCircleOutline, removeCircleOutline, timeOutline, chevronDownOutline, chevronUpOutline });
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
    const saveAndFinish = async () => {
      this.editing = false;
      this.loadProducts();
      const toast = await this.toastCtrl.create({ message: this.isNew ? 'Product added' : 'Product updated', duration: 2000 });
      await toast.present();
    };
    if (this.isNew) {
      this.api.createProduct(this.form).subscribe({ next: saveAndFinish });
    } else {
      this.api.updateProduct(this.editId, this.form).subscribe({ next: saveAndFinish });
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
