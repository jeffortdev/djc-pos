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
  templateUrl: './transactions.page.html',
  styleUrls: ['./transactions.page.scss'],
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
        (tx.personel?.toLowerCase().includes(q)) ||
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
