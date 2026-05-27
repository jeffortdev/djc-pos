import { Component, OnInit } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
  IonIcon, IonSpinner, IonButton, IonChip, IonLabel, IonRefresher, IonRefresherContent,
  IonInfiniteScroll, IonInfiniteScrollContent, IonSegment, IonSegmentButton,
  ModalController, AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { receiptOutline, trashOutline, eyeOutline, arrowUpOutline, arrowDownOutline, walletOutline, chatbubbleOutline, cubeOutline, hourglassOutline, cashOutline } from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
import { BrandingService } from '../../services/branding.service';
import { Transaction, StockEntry, CartItem } from '../../models/models';
import { ReceiptModalComponent } from '../pos/receipt-modal/receipt-modal.component';
import { PaymentModalComponent } from '../pos/payment-modal/payment-modal.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DatePipe, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
    IonIcon, IonSpinner, IonButton, IonChip, IonLabel, IonRefresher, IonRefresherContent,
    IonInfiniteScroll, IonInfiniteScrollContent, IonSegment, IonSegmentButton,
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

      @if (activeTab === 'sales') {
        @if (loading) {
          <div class="loading-center">
            <ion-spinner name="crescent"></ion-spinner>
          </div>
        } @else if (transactions.length === 0) {
          <div class="empty-state">
            <ion-icon name="receipt-outline"></ion-icon>
            <p>No transactions found.</p>
          </div>
        } @else {
          <div class="tx-list">
            @for (tx of transactions; track tx.id) {
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
                      } @else {
                        <ion-chip [color]="paymentColor(tx.payment_method)" size="small">
                          <ion-label>{{ tx.payment_method }}</ion-label>
                        </ion-chip>
                      }
                    </div>
                  </div>
                  <div class="tx-actions">
                    <ion-button fill="clear" size="small"
                      (click)="guardTap(() => viewReceipt(tx))"
                      (touchstart)="startLongPress('View Receipt')"
                      (touchend)="endLongPress()"
                      (touchmove)="endLongPress()">
                      <ion-icon name="eye-outline" slot="icon-only"></ion-icon>
                    </ion-button>
                    @if ((tx.status ?? 'paid') === 'pending') {
                      <ion-button fill="clear" color="success" size="small"
                        (click)="guardTap(() => acceptPayment(tx))"
                        (touchstart)="startLongPress('Accept Payment')"
                        (touchend)="endLongPress()"
                        (touchmove)="endLongPress()">
                        <ion-icon name="cash-outline" slot="icon-only"></ion-icon>
                      </ion-button>
                    }
                    @if (tx.phone_number) {
                      <div class="icon-btn-wrap">
                        <ion-button fill="clear" color="success" size="small"
                          (click)="guardTap(() => sendPickupSms(tx))"
                          (touchstart)="startLongPress('Notify Customer')"
                          (touchend)="endLongPress()"
                          (touchmove)="endLongPress()">
                          <ion-icon name="chatbubble-outline" slot="icon-only"></ion-icon>
                        </ion-button>
                        @if ((tx.notify_count ?? 0) > 0) {
                          <span class="notify-badge-overlay">{{ tx.notify_count }}</span>
                        }
                      </div>
                    }
                    <ion-button fill="clear" color="danger" size="small"
                      (click)="guardTap(() => deleteTransaction(tx))"
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
          @if (hasMore) {
            <ion-infinite-scroll (ionInfinite)="loadMore($event)">
              <ion-infinite-scroll-content loadingText="Loading more..."></ion-infinite-scroll-content>
            </ion-infinite-scroll>
          }
        }
      }

      @if (activeTab === 'cash') {
        @if (cashLoading) {
          <div class="loading-center"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (registerHistory.length === 0) {
          <div class="empty-state">
            <ion-icon name="wallet-outline"></ion-icon>
            <p>No cash adjustments recorded.</p>
          </div>
        } @else {
          <div class="tx-list">
            @for (entry of registerHistory; track entry.id) {
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
        } @else if (stockHistory.length === 0) {
          <div class="empty-state">
            <ion-icon name="cube-outline"></ion-icon>
            <p>No stock changes recorded.</p>
          </div>
        } @else {
          <div class="tx-list">
            @for (entry of stockHistory; track entry.id) {
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
    .history-segment { margin: 8px; }
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
    .tx-actions { display: flex; gap: 2px; margin-top: 8px; align-items: center; }
    .icon-btn-wrap { position: relative; display: inline-flex; }
    .notify-badge-overlay { position: absolute; top: 4px; right: 4px; display: inline-flex; align-items: center; justify-content: center; background: var(--ion-color-success); color: #fff; border-radius: 50%; width: 14px; height: 14px; font-size: 0.6rem; font-weight: 700; pointer-events: none; }
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

  constructor(
    private api: DatabaseService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    public branding: BrandingService,
  ) {
    addIcons({ receiptOutline, trashOutline, eyeOutline, arrowUpOutline, arrowDownOutline, walletOutline, chatbubbleOutline, cubeOutline, hourglassOutline, cashOutline });
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
    this.load();
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

  async acceptPayment(tx: Transaction): Promise<void> {
    const full = await firstValueFrom(this.api.getTransaction(tx.id));
    const cartItems: CartItem[] = (full.items ?? []).map(i => ({
      service_id: i.service_id,
      service_name: i.service_name,
      unit: i.unit,
      price: i.price,
      quantity: i.quantity,
      item_type: i.item_type,
    }));

    const modal = await this.modalCtrl.create({
      component: PaymentModalComponent,
      componentProps: {
        cart: cartItems,
        allowPayLater: false,
        prefillCustomerName: full.customer_name ?? '',
        prefillPhone: full.phone_number ?? '',
      },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (!data?.confirmed) return;

    this.api.acceptPayment(full.id, {
      payment_method: data.result.payment_method,
      amount_tendered: data.result.amount_tendered,
      change_due: data.result.change_due,
    }).subscribe({
      next: async paidTx => {
        const idx = this.transactions.findIndex(t => t.id === full.id);
        if (idx >= 0) {
          this.transactions[idx] = {
            ...this.transactions[idx],
            status: 'paid',
            payment_method: data.result.payment_method,
          };
          this.transactions = [...this.transactions];
        }
        const toast = await this.toastCtrl.create({ message: 'Payment accepted!', duration: 2500, color: 'success' });
        await toast.present();
        const receiptModal = await this.modalCtrl.create({
          component: ReceiptModalComponent,
          componentProps: { tx: paidTx },
        });
        await receiptModal.present();
      },
      error: async () => {
        const toast = await this.toastCtrl.create({ message: 'Failed to accept payment.', duration: 3000, color: 'danger' });
        await toast.present();
      },
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

  guardTap(action: () => void): void {
    if (this.longPressActive) {
      this.longPressActive = false;
      return;
    }
    action();
  }

  async sendPickupSms(tx: Transaction): Promise<void> {
    const defaultSms = `Hi {{customer_name}}! Your order #{{order_id}} is ready for pickup. Thank you for choosing DJC POS!`;
    const template = await firstValueFrom(this.api.getSetting('sms_message', defaultSms));
    const message = template
      .replace(/{{\s*order_id\s*}}/gi, String(tx.id))
      .replace(/{{\s*customer_name\s*}}/gi, tx.customer_name ?? '');
    window.open(`sms:${tx.phone_number}?body=${encodeURIComponent(message)}`, '_system');
    this.api.incrementNotifyCount(tx.id).subscribe(() => {
      tx.notify_count = (tx.notify_count ?? 0) + 1;
    });
  }
}
