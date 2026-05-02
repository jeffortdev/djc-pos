import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonSegment, IonSegmentButton, IonInput,
  IonButtons, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline, cardOutline, phonePortraitOutline,
  checkmarkDoneOutline, closeOutline, swapHorizontalOutline
} from 'ionicons/icons';
import { CartItem } from '../../../models/models';

export interface PaymentResult {
  payment_method: string;
  amount_tendered: number;
  change_due: number;
  phone_number: string;
  notes: string;
}

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonList, IonItem, IonLabel, IonSegment, IonSegmentButton, IonInput,
    IonButtons,
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
          <img src="assets/logo.svg" alt="DJC POS" class="header-logo">
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Readonly order summary -->
      <ion-list>
        @for (item of cart; track item.service_id) {
          <ion-item>
            <ion-label>{{ item.service_name }}</ion-label>
            <div slot="end" class="summary-right">
              <span class="summary-qty">× {{ item.quantity }}</span>
              <span class="summary-price">{{ item.price * item.quantity | currency:'PHP':'symbol':'1.2-2' }}</span>
            </div>
          </ion-item>
        }
      </ion-list>

      <div class="total-bar">
        <span>Total</span>
        <strong class="total-amount">{{ total | currency:'PHP':'symbol':'1.2-2' }}</strong>
      </div>

      <!-- Payment method -->
      <ion-segment [(ngModel)]="method" class="method-segment">
        <ion-segment-button value="cash">
          <ion-icon name="cash-outline"></ion-icon>
          <ion-label>Cash</ion-label>
        </ion-segment-button>
        <ion-segment-button value="card">
          <ion-icon name="card-outline"></ion-icon>
          <ion-label>Card</ion-label>
        </ion-segment-button>
        <ion-segment-button value="gcash">
          <ion-icon name="phone-portrait-outline"></ion-icon>
          <ion-label>GCash</ion-label>
        </ion-segment-button>
      </ion-segment>

      @if (method === 'cash') {
        <ion-list>
          <ion-item>
            <ion-label position="stacked">Amount Tendered</ion-label>
            <ion-input type="number" min="0" step="0.01" [(ngModel)]="tendered" placeholder="0.00"></ion-input>
          </ion-item>
        </ion-list>
        <div class="quick-tender">
          @for (amt of quickAmounts; track amt) {
            <ion-button fill="outline" size="small" (click)="tendered = amt">
              {{ amt | currency:'PHP':'symbol':'1.0-0' }}
            </ion-button>
          }
        </div>
        @if (change > 0) {
          <div class="change-display">
            <ion-icon name="swap-horizontal-outline"></ion-icon>
            Change: <strong>{{ change | currency:'PHP':'symbol':'1.2-2' }}</strong>
          </div>
        }
        @if (tendered > 0 && tendered < total) {
          <div class="insufficient">Insufficient amount</div>
        }
      }

      <ion-list>
        <ion-item>
          <ion-label position="stacked">Phone Number (optional)</ion-label>
          <ion-input type="tel" [(ngModel)]="phoneNumber" placeholder="e.g. 09171234567"></ion-input>
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Notes (optional)</ion-label>
          <ion-input [(ngModel)]="notes" placeholder="Customer name, special instructions..."></ion-input>
        </ion-item>
      </ion-list>

      <div class="confirm-wrap">
        <ion-button expand="block" [disabled]="!canConfirm" (click)="confirm()" color="primary">
          <ion-icon name="checkmark-done-outline" slot="start"></ion-icon>
          Confirm Payment — {{ total | currency:'PHP':'symbol':'1.2-2' }}
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .summary-right { display: flex; gap: 10px; align-items: center; }
    .summary-qty { opacity: 0.55; font-size: 0.82rem; }
    .summary-price { font-weight: 600; font-size: 0.9rem; }
    .total-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: var(--ion-color-light); }
    .total-amount { font-size: 1.3rem; color: var(--ion-color-primary); }
    .method-segment { margin: 8px; }
    .quick-tender { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 16px; }
    .quick-tender ion-button { min-width: 80px; }
    .change-display { display: flex; align-items: center; gap: 8px; padding: 8px 16px; color: var(--ion-color-success); font-weight: 500; }
    .insufficient { padding: 8px 16px; color: var(--ion-color-danger); font-size: 0.9rem; }
    .confirm-wrap { padding: 12px 16px calc(16px + env(safe-area-inset-bottom)); }
  `],
})
export class PaymentModalComponent implements OnInit {
  @Input() cart: CartItem[] = [];

  method = 'cash';
  tendered = 0;
  phoneNumber = '';
  notes = '';

  constructor(private modalCtrl: ModalController) {
    addIcons({ cashOutline, cardOutline, phonePortraitOutline, checkmarkDoneOutline, closeOutline, swapHorizontalOutline });
  }

  ngOnInit(): void {
    this.tendered = this.total;
  }

  get total(): number {
    return parseFloat(this.cart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2));
  }

  get quickAmounts(): number[] {
    const t = this.total;
    const ceil5 = Math.ceil(t / 5) * 5;
    const ceil10 = Math.ceil(t / 10) * 10;
    const ceil20 = Math.ceil(t / 20) * 20;
    return [...new Set([ceil5, ceil10, ceil20, ceil20 + 20])].filter(a => a >= t).slice(0, 4);
  }

  get change(): number {
    return Math.max(0, parseFloat((this.tendered - this.total).toFixed(2)));
  }

  get canConfirm(): boolean {
    return this.method !== 'cash' || this.tendered >= this.total;
  }

  dismiss(): void {
    this.modalCtrl.dismiss(null);
  }

  confirm(): void {
    const result: PaymentResult = {
      payment_method: this.method,
      amount_tendered: this.method === 'cash' ? this.tendered : this.total,
      change_due: this.method === 'cash' ? this.change : 0,
      phone_number: this.phoneNumber,
      notes: this.notes,
    };
    this.modalCtrl.dismiss({ confirmed: true, result });
  }
}
