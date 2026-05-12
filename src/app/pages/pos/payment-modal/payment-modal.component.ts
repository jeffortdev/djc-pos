import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonSegment, IonSegmentButton, IonInput,
  IonButtons, ModalController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline, cardOutline, phonePortraitOutline,
  checkmarkDoneOutline, closeOutline, swapHorizontalOutline
} from 'ionicons/icons';
import { CartItem } from '../../../models/models';
import { BrandingService } from '../../../services/branding.service';
import { DatabaseService } from '../../../services/database.service';

export interface PaymentResult {
  payment_method: string;
  amount_tendered: number;
  change_due: number;
  customer_name: string;
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
  providers: [ModalController, AlertController],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="dismiss()">
            <ion-icon name="close-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
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
      <!-- Customer name — first field with autocomplete -->
      <div class="name-wrap">
        <ion-list>
          <ion-item>
            <ion-label position="stacked">Customer Name (optional)</ion-label>
            <ion-input
              [(ngModel)]="customerName"
              (ngModelChange)="onNameChange($event)"
              (ionBlur)="suggestions = []"
              placeholder="e.g. Juan dela Cruz"
              autocomplete="off">
            </ion-input>
          </ion-item>
        </ion-list>
        @if (suggestions.length > 0) {
          <div class="suggestions">
            @for (s of suggestions; track s.name) {
              <div class="suggestion-item" (mousedown)="selectSuggestion(s)">
                <span class="s-name">{{ s.name }}</span>
                @if (s.phone_number) { <span class="s-phone">{{ s.phone_number }}</span> }
              </div>
            }
          </div>
        }
      </div>

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
          <ion-input type="tel" [(ngModel)]="phoneNumber" (ionBlur)="onPhoneBlur()" placeholder="e.g. 09171234567"></ion-input>
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Notes (optional)</ion-label>
          <ion-input [(ngModel)]="notes" placeholder="Special instructions..."></ion-input>
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
    .name-wrap { position: relative; }
    .suggestions { position: absolute; left: 0; right: 0; z-index: 100; background: var(--ion-background-color, #fff); border: 1px solid var(--ion-border-color, #ddd); border-top: none; border-radius: 0 0 8px 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.12); max-height: 200px; overflow-y: auto; }
    .suggestion-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; cursor: pointer; }
    .suggestion-item:active { background: var(--ion-color-light); }
    .s-name { font-weight: 500; }
    .s-phone { font-size: 0.8rem; opacity: 0.6; }
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
  customerName = '';
  phoneNumber = '';
  notes = '';
  suggestions: { name: string; phone_number: string }[] = [];

  constructor(
    private modalCtrl: ModalController,
    public branding: BrandingService,
    private db: DatabaseService,
    private alertCtrl: AlertController,
  ) {
    addIcons({ cashOutline, cardOutline, phonePortraitOutline, checkmarkDoneOutline, closeOutline, swapHorizontalOutline });
  }

  ngOnInit(): void {
    this.tendered = this.total;
  }

  onNameChange(value: string): void {
    const q = (value ?? '').trim();
    if (q.length < 2) {
      this.suggestions = [];
      return;
    }
    this.db.searchCustomers(q).subscribe(results => {
      this.suggestions = results;
    });
  }

  async onPhoneBlur(): Promise<void> {
    const phone = this.phoneNumber.trim();
    const newName = this.customerName.trim();
    if (!phone || !newName) return;

    this.db.getKnownNameForPhone(phone).subscribe(async knownName => {
      if (!knownName || knownName.toLowerCase() === newName.toLowerCase()) return;

      const alert = await this.alertCtrl.create({
        header: 'Name Mismatch',
        message: `This phone number was previously used by "${knownName}". Keep the existing name or update to "${newName}"?`,
        buttons: [
          {
            text: `Keep "${knownName}"`,
            handler: () => { this.customerName = knownName; },
          },
          {
            text: `Use "${newName}"`,
            role: 'destructive',
          },
        ],
      });
      await alert.present();
    });
  }

  selectSuggestion(s: { name: string; phone_number: string }): void {
    this.customerName = s.name;
    this.phoneNumber = s.phone_number;
    this.suggestions = [];
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
      customer_name: this.customerName,
      phone_number: this.phoneNumber,
      notes: this.notes,
    };
    this.modalCtrl.dismiss({ confirmed: true, result });
  }
}
