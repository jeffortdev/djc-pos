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
  templateUrl: './loyalty-transactions-modal.component.html',
  styleUrls: ['./loyalty-transactions-modal.component.scss'],
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
