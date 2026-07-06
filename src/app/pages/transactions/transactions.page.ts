import { Component, OnInit } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
  IonIcon, IonSpinner, IonButton, IonChip, IonLabel, IonRefresher, IonRefresherContent,
  IonInfiniteScroll, IonInfiniteScrollContent, IonSegment, IonSegmentButton, IonSearchbar,
  IonItem, IonInput, IonSelect, IonSelectOption,
  ModalController, AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { receiptOutline, trashOutline, eyeOutline, arrowUpOutline, arrowDownOutline, walletOutline, cubeOutline, hourglassOutline, checkmarkDoneOutline, searchOutline, closeOutline } from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
import { BrandingService } from '../../services/branding.service';
import { Transaction, StockEntry } from '../../models/models';
import { ReceiptModalComponent } from '../pos/receipt-modal/receipt-modal.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DatePipe, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
    IonIcon, IonSpinner, IonButton, IonChip, IonLabel, IonRefresher, IonRefresherContent,
    IonInfiniteScroll, IonInfiniteScrollContent, IonSegment, IonSegmentButton, IonSearchbar,
    IonItem, IonInput, IonSelect, IonSelectOption,
  ],
  providers: [ModalController, AlertController, ToastController],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>
          <div class="title-inner-wrap">
            <img [src]="branding.logoSrc$ | async" alt="logo" class="header-logo">
            @if ((branding.appTitle$ | async) !== 'DJC Point of Sale') {
              <span class="header-title">{{ branding.appTitle$ | async }}</span>
            }
          </div>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-searchbar
        [(ngModel)]="searchQuery"
        (ionInput)="onSearch($event)"
        (ionClear)="clearSearch()"
        placeholder="Search by name, phone, notes, ID…"
        debounce="300"
        class="history-search"
      ></ion-searchbar>

      <ion-segment [(ngModel)]="activeTab" class="history-segment">
        <ion-segment-button value="sales">
          <ion-icon name="receipt-outline"></ion-icon>
          <ion-label>Sales</ion-label>
        </ion-segment-button>
        <ion-segment-button value="cash">
          <ion-icon name="wallet-outline"></ion-icon>
          <ion-label>Cash</ion-label>
        </ion-segment-button>
        <ion-segment-button value="stock">
          <ion-icon name="cube-outline"></ion-icon>
          <ion-label>Stock</ion-label>
        </ion-segment-button>
      </ion-segment>

      <!-- Sales Filters -->
      @if (activeTab === 'sales') {
        <div class="filter-section">
          <div class="filter-row">
            <ion-item class="filter-item flex-1">
              <ion-label>Status</ion-label>
              <ion-select [(ngModel)]="statusFilter" (ionChange)="onFilterChange()">
                <ion-select-option value="">All</ion-select-option>
                <ion-select-option value="pending">Pending</ion-select-option>
                <ion-select-option value="paid">Paid</ion-select-option>
                <ion-select-option value="picked_up">Picked Up</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item class="filter-item flex-1">
              <ion-label>Payment</ion-label>
              <ion-select [(ngModel)]="paymentMethodFilter" (ionChange)="onFilterChange()">
                <ion-select-option value="">All</ion-select-option>
                <ion-select-option value="cash">Cash</ion-select-option>
                <ion-select-option value="card">Card</ion-select-option>
                <ion-select-option value="check">Check</ion-select-option>
                <ion-select-option value="other">Other</ion-select-option>
              </ion-select>
            </ion-item>
          </div>
        </div>
      }

      <!-- Cash Filters -->
      @if (activeTab === 'cash') {
        <div class="filter-section">
          <ion-item class="filter-item">
            <ion-input placeholder="Search notes..." [(ngModel)]="cashSearchQuery" (ionInput)="onFilterChange()"></ion-input>
          </ion-item>
        </div>
      }

      <!-- Stock Filters -->
      @if (activeTab === 'stock') {
        <div class="filter-section">
          <ion-item class="filter-item">
            <ion-input placeholder="Search product name..." [(ngModel)]="stockSearchQuery" (ionInput)="onFilterChange()"></ion-input>
          </ion-item>
          <ion-item class="filter-item">
            <ion-label>Reason</ion-label>
            <ion-select [(ngModel)]="stockReasonFilter" (ionChange)="onFilterChange()">
              <ion-select-option value="">All Reasons</ion-select-option>
              <ion-select-option value="adjustment">Adjustment</ion-select-option>
              <ion-select-option value="sold">Sold</ion-select-option>
              <ion-select-option value="damaged">Damaged</ion-select-option>
              <ion-select-option value="received">Received</ion-select-option>
            </ion-select>
          </ion-item>
        </div>
      }

      @if (activeTab === 'sales') {
        @if (loading) {
          <div class="loading-center">
            <ion-spinner name="crescent"></ion-spinner>
          </div>
        } @else if (filteredTransactions.length === 0) {
          <div class="empty-state">
            <ion-icon name="receipt-outline"></ion-icon>
            <p>{{ transactions.length === 0 ? 'No transactions found.' : 'No matching transactions.' }}</p>
          </div>
        } @else {
          <div class="tx-list">
            @for (tx of filteredTransactions; track tx.id) {
              <ion-card class="tx-card">
                <ion-card-content>
                  <div class="tx-row">
                    <div class="tx-meta">
                      <span class="tx-id"># {{ tx.id }}</span>
                      <span class="tx-date">{{ tx.created_at | date:'medium' }}</span>
                      @if (tx.customer_name) { <span class="tx-customer">{{ tx.customer_name }}</span> }
                      @if (tx.notes) { <span class="tx-notes">{{ tx.notes }}</span> }
                    </div>
                    <div class="tx-right">
                      <span class="tx-total">{{ tx.total | currency:'PHP':'symbol':'1.2-2' }}</span>
                      @if ((tx.status ?? 'paid') === 'pending') {
                        <ion-chip color="warning" size="small">
                          <ion-icon name="hourglass-outline" slot="start" aria-hidden="true"></ion-icon>
                          <ion-label>Pending</ion-label>
                        </ion-chip>
                      } @else if (tx.status === 'picked_up') {
                        <ion-chip color="success" size="small">
                          <ion-icon name="checkmark-done-outline" slot="start" aria-hidden="true"></ion-icon>
                          <ion-label>Picked Up</ion-label>
                        </ion-chip>
                      } @else {
                        <ion-chip [color]="paymentColor(tx.payment_method)" size="small">
                          <ion-label>{{ tx.payment_method }}</ion-label>
                        </ion-chip>
                      }
                    </div>
                  </div>
                  <div class="tx-actions">
                    <ion-button fill="clear"
                      (click)="onReceiptTap(tx)"
                      (touchstart)="startLongPress('View Receipt')"
                      (touchend)="endLongPress()"
                      (touchmove)="endLongPress()">
                      <ion-icon name="eye-outline" slot="icon-only"></ion-icon>
                    </ion-button>
                    <ion-button fill="clear" color="danger"
                      (click)="onDeleteTap(tx)"
                      (touchstart)="startLongPress('Delete Transaction')"
                      (touchend)="endLongPress()"
                      (touchmove)="endLongPress()">
                      <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                    </ion-button>
                  </div>
                </ion-card-content>
              </ion-card>
            }
          </div>
          @if (hasMore && !searchQuery) {
            <ion-infinite-scroll (ionInfinite)="loadMore($event)">
              <ion-infinite-scroll-content loadingText="Loading more..."></ion-infinite-scroll-content>
            </ion-infinite-scroll>
          }
        }
      }

      @if (activeTab === 'cash') {
        @if (cashLoading) {
          <div class="loading-center"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (filteredCashHistory.length === 0) {
          <div class="empty-state">
            <ion-icon name="wallet-outline"></ion-icon>
            <p>{{ registerHistory.length === 0 ? 'No cash adjustments recorded.' : 'No matching entries.' }}</p>
          </div>
        } @else {
          <div class="tx-list">
            @for (entry of filteredCashHistory; track entry.id) {
              <ion-card class="tx-card">
                <ion-card-content>
                  <div class="tx-row">
                    <div class="tx-meta">
                      <span class="tx-date">{{ entry.created_at | date:'medium' }}</span>
                      @if (entry.note) { <span class="tx-notes">{{ entry.note }}</span> }
                    </div>
                    <div class="tx-right">
                      <span class="tx-total" [class.neg-amount]="entry.amount < 0">
                        {{ entry.amount >= 0 ? '+' : '' }}{{ entry.amount | currency:'PHP':'symbol':'1.2-2' }}
                      </span>
                      <ion-chip [color]="entry.amount >= 0 ? 'success' : 'danger'" size="small">
                        <ion-icon [name]="entry.amount >= 0 ? 'arrow-up-outline' : 'arrow-down-outline'" slot="start"></ion-icon>
                        <ion-label>{{ entry.amount >= 0 ? 'Added' : 'Removed' }}</ion-label>
                      </ion-chip>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>
            }
          </div>
        }
      }

      @if (activeTab === 'stock') {
        @if (stockLoading) {
          <div class="loading-center"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (filteredStockHistory.length === 0) {
          <div class="empty-state">
            <ion-icon name="cube-outline"></ion-icon>
            <p>{{ stockHistory.length === 0 ? 'No stock changes recorded.' : 'No matching entries.' }}</p>
          </div>
        } @else {
          <div class="tx-list">
            @for (entry of filteredStockHistory; track entry.id) {
              <ion-card class="tx-card">
                <ion-card-content>
                  <div class="tx-row">
                    <div class="tx-meta">
                      <span class="tx-id">{{ entry.product_name }}</span>
                      <span class="tx-date">{{ entry.created_at | date:'medium' }}</span>
                      @if (entry.note) { <span class="tx-notes">{{ entry.note }}</span> }
                    </div>
                    <div class="tx-right">
                      <span class="tx-total" [class.neg-amount]="entry.delta < 0">
                        {{ entry.delta > 0 ? '+' : '' }}{{ entry.delta }} pcs
                      </span>
                      <ion-chip [color]="entry.delta > 0 ? 'success' : 'danger'" size="small">
                        <ion-label>{{ entry.reason | titlecase }}</ion-label>
                      </ion-chip>
                      <span class="stock-after">Stock: {{ entry.stock_after }}</span>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>
            }
          </div>
          @if (stockHasMore) {
            <ion-infinite-scroll (ionInfinite)="loadMoreStock($event)">
              <ion-infinite-scroll-content loadingText="Loading more..."></ion-infinite-scroll-content>
            </ion-infinite-scroll>
          }
        }
      }
    </ion-content>
  `,
  styles: [`
    .loading-center { display: flex; justify-content: center; align-items: center; height: 60vh; }
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 48px; opacity: 0.4; }
    .empty-state ion-icon { font-size: 3rem; }
    .history-search { padding: 4px 8px 0; }
    .history-segment { margin: 4px 8px 8px; }
    .filter-section { padding: 8px; background-color: var(--ion-background-color); }
    .filter-item { --padding-start: 0; --padding-end: 0; margin-bottom: 8px; }
    .filter-row { display: flex; gap: 8px; }
    .flex-1 { flex: 1; }
    .tx-list { padding: 8px; display: flex; flex-direction: column; gap: 8px; }
    .tx-card ion-card-content { padding: 12px; }
    .tx-row { display: flex; gap: 8px; justify-content: space-between; align-items: flex-start; }
    .tx-meta { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .tx-id { font-weight: 700; font-size: 0.95rem; }
    .tx-date { font-size: 0.78rem; opacity: 0.6; }
    .tx-notes { font-size: 0.78rem; font-style: italic; opacity: 0.7; }
    .tx-customer { font-size: 0.85rem; font-weight: 600; }
    .tx-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .tx-total { font-weight: 700; font-size: 1rem; color: var(--ion-color-primary); }
    .neg-amount { color: var(--ion-color-danger) !important; }
    .stock-after { font-size: 0.72rem; opacity: 0.6; }
    .tx-actions { display: flex; gap: 0; margin-top: 4px; align-items: center; }
  `],
})
export class TransactionsPage implements OnInit, ViewWillEnter {
  transactions: Transaction[] = [];
  registerHistory: { id: number; amount: number; note: string; created_at: string }[] = [];
  stockHistory: StockEntry[] = [];
  activeTab: 'sales' | 'cash' | 'stock' = 'sales';
  loading = true;
  cashLoading = true;
  stockLoading = true;
  offset = 0;
  limit = 20;
  hasMore = false;
  stockOffset = 0;
  stockHasMore = false;
  // Filters
  searchQuery = '';
  statusFilter = '';
  paymentMethodFilter = '';
  cashSearchQuery = '';
  stockSearchQuery = '';
  stockReasonFilter = '';

  get filteredTransactions(): Transaction[] {
    const q = this.searchQuery.toLowerCase().trim();
    return this.transactions.filter(tx => {
      const matchesSearch = !q ||
        (tx.customer_name?.toLowerCase().includes(q)) ||
        (tx.phone_number?.toLowerCase().includes(q)) ||
        (tx.notes?.toLowerCase().includes(q)) ||
        String(tx.id).includes(q);

      const status = tx.status ?? 'paid';
      const matchesStatus = !this.statusFilter || status === this.statusFilter;
      const matchesPayment = !this.paymentMethodFilter || tx.payment_method === this.paymentMethodFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }

  get filteredCashHistory() {
    const q = this.cashSearchQuery.toLowerCase().trim();
    return this.registerHistory.filter(entry =>
      !q ||
      (entry.note?.toLowerCase().includes(q)) ||
      String(entry.amount).includes(q)
    );
  }

  get filteredStockHistory() {
    const q = this.stockSearchQuery.toLowerCase().trim();
    return this.stockHistory.filter(entry => {
      const matchesSearch = !q || (entry.product_name?.toLowerCase().includes(q));
      const matchesReason = !this.stockReasonFilter || entry.reason === this.stockReasonFilter;
      return matchesSearch && matchesReason;
    });
  }

  constructor(
    private api: DatabaseService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    public branding: BrandingService,
  ) {
    addIcons({ receiptOutline, trashOutline, eyeOutline, arrowUpOutline, arrowDownOutline, walletOutline, cubeOutline, hourglassOutline, checkmarkDoneOutline, searchOutline, closeOutline });
  }

  ngOnInit(): void { }

  ionViewWillEnter(): void { this.reset(); }

  reset(): void {
    this.transactions = [];
    this.offset = 0;
    this.hasMore = false;
    this.loading = true;
    this.cashLoading = true;
    this.stockLoading = true;
    this.stockHistory = [];
    this.stockOffset = 0;
    this.stockHasMore = false;
    this.clearFilters();
    this.load();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = '';
    this.paymentMethodFilter = '';
    this.cashSearchQuery = '';
    this.stockSearchQuery = '';
    this.stockReasonFilter = '';
  }

  onFilterChange(): void {
    // Filters are applied via getters, no additional action needed
  }

  load(): void {
    this.api.getTransactions(this.limit + 1, this.offset).subscribe(txs => {
      this.hasMore = txs.length > this.limit;
      this.transactions = [...this.transactions, ...txs.slice(0, this.limit)];
      this.loading = false;
    });
    this.api.getRegisterEntries().subscribe(entries => {
      this.registerHistory = entries;
      this.cashLoading = false;
    });
    this.api.getAllStockHistory(this.limit + 1, 0).subscribe(entries => {
      this.stockHasMore = entries.length > this.limit;
      this.stockHistory = entries.slice(0, this.limit);
      this.stockLoading = false;
    });
  }

  loadMore(event: CustomEvent): void {
    this.offset += this.limit;
    this.api.getTransactions(this.limit + 1, this.offset).subscribe(txs => {
      this.hasMore = txs.length > this.limit;
      this.transactions = [...this.transactions, ...txs.slice(0, this.limit)];
      (event.target as HTMLIonInfiniteScrollElement).complete();
    });
  }

  loadMoreStock(event: CustomEvent): void {
    this.stockOffset += this.limit;
    this.api.getAllStockHistory(this.limit + 1, this.stockOffset).subscribe(entries => {
      this.stockHasMore = entries.length > this.limit;
      this.stockHistory = [...this.stockHistory, ...entries.slice(0, this.limit)];
      (event.target as HTMLIonInfiniteScrollElement).complete();
    });
  }

  refresh(event: CustomEvent): void {
    this.transactions = [];
    this.offset = 0;
    this.hasMore = false;
    this.loading = true;
    this.cashLoading = true;
    this.stockLoading = true;
    this.stockHistory = [];
    this.stockOffset = 0;
    this.stockHasMore = false;
    this.api.getTransactions(this.limit + 1, 0).subscribe(txs => {
      this.hasMore = txs.length > this.limit;
      this.transactions = txs.slice(0, this.limit);
      this.loading = false;
      (event.target as HTMLIonRefresherElement).complete();
    });
    this.api.getRegisterEntries().subscribe(entries => {
      this.registerHistory = entries;
      this.cashLoading = false;
    });
    this.api.getAllStockHistory(this.limit + 1, 0).subscribe(entries => {
      this.stockHasMore = entries.length > this.limit;
      this.stockHistory = entries.slice(0, this.limit);
      this.stockLoading = false;
    });
  }

  async viewReceipt(tx: Transaction): Promise<void> {
    this.api.getTransaction(tx.id).subscribe(async full => {
      const modal = await this.modalCtrl.create({
        component: ReceiptModalComponent,
        componentProps: { tx: full },
      });
      await modal.present();
    });
  }

  async deleteTransaction(tx: Transaction): Promise<void> {
    // Step 1: verify PIN
    const pinAlert = await this.alertCtrl.create({
      header: 'Enter PIN',
      inputs: [{ name: 'pin', type: 'password', placeholder: 'PIN' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'OK',
          handler: async (data) => {
            const pin = data.pin?.toString() ?? '';
            this.api.getSetting('register_pin', '1234').subscribe(async stored => {
              if (pin !== stored) {
                const errAlert = await this.alertCtrl.create({
                  header: 'Incorrect PIN',
                  message: 'The PIN you entered is wrong.',
                  buttons: ['OK'],
                });
                await errAlert.present();
                return;
              }
              // Step 2: confirm delete
              const confirmAlert = await this.alertCtrl.create({
                header: 'Delete Transaction',
                message: `Delete transaction #${tx.id}?`,
                buttons: [
                  { text: 'Cancel', role: 'cancel' },
                  {
                    text: 'Delete', role: 'destructive',
                    handler: () => {
                      this.api.deleteTransaction(tx.id).subscribe(async () => {
                        this.transactions = this.transactions.filter(t => t.id !== tx.id);
                        const toast = await this.toastCtrl.create({ message: 'Transaction deleted', duration: 2000 });
                        await toast.present();
                      });
                    },
                  },
                ],
              });
              await confirmAlert.present();
            });
          },
        },
      ],
    });
    await pinAlert.present();
  }

  paymentColor(method: string): string {
    return method === 'cash' ? 'success' : method === 'card' ? 'primary' : 'warning';
  }

  onSearch(event: CustomEvent): void {
    const q = (event.detail.value ?? '').trim();
    this.searchQuery = q;
    if (!q) {
      this.clearSearch();
      return;
    }
    this.loading = true;
    this.api.searchTransactions(q).subscribe(txs => {
      this.transactions = txs;
      this.hasMore = false;
      this.loading = false;
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.transactions = [];
    this.offset = 0;
    this.hasMore = false;
    this.loading = true;
    this.api.getTransactions(this.limit + 1, 0).subscribe(txs => {
      this.hasMore = txs.length > this.limit;
      this.transactions = txs.slice(0, this.limit);
      this.loading = false;
    });
  }

  private _tooltipTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressActive = false;

  startLongPress(label: string): void {
    this.longPressActive = false;
    this._tooltipTimer = setTimeout(async () => {
      this.longPressActive = true;
      const toast = await this.toastCtrl.create({
        message: label,
        duration: 1200,
        position: 'bottom',
        cssClass: 'action-tooltip-toast',
      });
      await toast.present();
    }, 600);
  }

  endLongPress(): void {
    if (this._tooltipTimer !== null) {
      clearTimeout(this._tooltipTimer);
      this._tooltipTimer = null;
    }
  }

  onReceiptTap(tx: Transaction): void {
    if (this.longPressActive) { this.longPressActive = false; return; }
    this.viewReceipt(tx);
  }

  onDeleteTap(tx: Transaction): void {
    if (this.longPressActive) { this.longPressActive = false; return; }
    this.deleteTransaction(tx);
  }
}
