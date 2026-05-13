import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonSpinner, IonChip, IonLabel, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { DatabaseService } from '../../../services/database.service';
import { LaundryService, LoyaltyEntry, Transaction, TransactionItem } from '../../../models/models';

@Component({
  selector: 'app-loyalty-transactions-modal',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DatePipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonSpinner, IonChip, IonLabel,
  ],
  providers: [ModalController],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="dismiss()">
            <ion-icon name="close-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>
          <div class="title-wrap">
            <span class="title-name">{{ entry.customer_name || entry.phone_number }}</span>
            @if (entry.customer_name) {
              <span class="title-phone">{{ entry.phone_number }}</span>
            }
          </div>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading) {
        <div class="loading-center"><ion-spinner name="crescent"></ion-spinner></div>
      } @else if (transactions.length === 0) {
        <p class="empty">No transactions found.</p>
      } @else {
        <div class="summary-bar">
          <span>{{ totalServiceCount }} services ({{ transactions.length }} transactions)</span>
          <span class="summary-total">{{ totalSpent | currency:'PHP':'symbol':'1.2-2' }} total</span>
        </div>
        @for (tx of transactions; track tx.id) {
          <div class="tx-row">
            <div class="tx-meta">
              <span class="tx-id">#{{ tx.id }}</span>
              <span class="tx-date">{{ tx.created_at | date:'medium' }}</span>
              @if (tx.notes) { <span class="tx-notes">{{ tx.notes }}</span> }
              <div class="tx-services">
                @for (item of loyaltyItems(tx); track item.id) {
                  <span class="svc-chip">{{ item.service_name }}{{ item.quantity > 1 ? ' ×' + item.quantity : '' }}</span>
                }
              </div>
            </div>
            <div class="tx-right">
              <span class="tx-total">{{ tx.total | currency:'PHP':'symbol':'1.2-2' }}</span>
              <ion-chip [color]="paymentColor(tx.payment_method)" size="small">
                <ion-label>{{ tx.payment_method }}</ion-label>
              </ion-chip>
            </div>
          </div>
        }
      }
    </ion-content>
  `,
  styles: [`
    .title-wrap { display: flex; flex-direction: column; line-height: 1.2; }
    .title-name { font-size: 0.95rem; font-weight: 700; }
    .title-phone { font-size: 0.72rem; opacity: 0.75; }
    .loading-center { display: flex; justify-content: center; align-items: center; height: 60vh; }
    .empty { text-align: center; color: var(--ion-color-medium); padding: 32px 16px; }
    .summary-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: var(--ion-color-light); font-size: 0.85rem; font-weight: 600; }
    .summary-total { color: var(--ion-color-primary); }
    .tx-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 10px 16px; border-bottom: 1px solid var(--ion-border-color); }
    .tx-meta { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .tx-id { font-weight: 700; font-size: 0.88rem; }
    .tx-date { font-size: 0.75rem; opacity: 0.6; }
    .tx-notes { font-size: 0.75rem; font-style: italic; opacity: 0.7; }
    .tx-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .tx-total { font-weight: 700; font-size: 0.9rem; white-space: nowrap; }
    .tx-services { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .svc-chip { font-size: 0.72rem; background: rgba(var(--ion-color-primary-rgb),0.12); color: var(--ion-color-primary); border-radius: 10px; padding: 2px 8px; white-space: nowrap; }
  `],
})
export class LoyaltyTransactionsModalComponent implements OnInit {
  @Input() entry!: LoyaltyEntry;

  loading = true;
  transactions: Transaction[] = [];
  loyaltyServiceIds = new Set<number>();

  constructor(private modalCtrl: ModalController, private db: DatabaseService) {
    addIcons({ closeOutline });
  }

  ngOnInit(): void {
    this.db.getAllServices().subscribe({
      next: (services: LaundryService[]) => {
        this.loyaltyServiceIds = new Set(
          services.filter(s => (s.loyalty_tracking ?? 1) === 1).map(s => s.id)
        );
      },
    });
    this.db.getLoyaltyTransactionsByPhone(this.entry.phone_number).subscribe({
      next: txs => { this.transactions = txs; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  get totalSpent(): number {
    return this.transactions.reduce((s, t) => s + t.total, 0);
  }

  get totalServiceCount(): number {
    return this.transactions.reduce((sum, tx) =>
      sum + (tx.items ?? []).filter(
        i => i.item_type !== 'product' && this.loyaltyServiceIds.has(i.service_id)
      ).reduce((s, i) => s + i.quantity, 0), 0
    );
  }

  paymentColor(method: string): string {
    return method === 'cash' ? 'success' : method === 'card' ? 'primary' : 'warning';
  }

  loyaltyItems(tx: Transaction): TransactionItem[] {
    return (tx.items ?? []).filter(
      i => i.item_type !== 'product' && this.loyaltyServiceIds.has(i.service_id)
    );
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }
}
