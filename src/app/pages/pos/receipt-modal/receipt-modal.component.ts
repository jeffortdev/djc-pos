import { Component, Input } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, printOutline, waterOutline } from 'ionicons/icons';
import { Transaction } from '../../../models/models';

@Component({
  selector: 'app-receipt-modal',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DatePipe, UpperCasePipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  ],
  providers: [ModalController],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="end">
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
      <div class="receipt">
        <div class="receipt-header">
          <img src="assets/logo-color.svg" alt="DJC POS" class="receipt-logo-img">
          <p class="receipt-date">{{ tx.created_at | date:'medium' }}</p>
          <p class="receipt-id"># {{ tx.id }}</p>
        </div>

        <div class="divider"></div>

        <div class="receipt-items">
          @for (item of tx.items; track item.id) {
            <div class="receipt-item">
              <div class="ri-left">
                <span class="ri-name">{{ item.service_name }}</span>
                <span class="ri-qty">{{ item.quantity }} × {{ item.price | currency:'PHP':'symbol':'1.2-2' }}</span>
              </div>
              <span class="ri-subtotal">{{ item.subtotal | currency:'PHP':'symbol':'1.2-2' }}</span>
            </div>
          }
        </div>

        <div class="divider"></div>

        <div class="receipt-totals">
          <div class="rt-row">
            <span>Subtotal</span><span>{{ tx.subtotal | currency:'PHP':'symbol':'1.2-2' }}</span>
          </div>
          @if (tx.tax > 0) {
            <div class="rt-row">
              <span>Tax</span><span>{{ tx.tax | currency:'PHP':'symbol':'1.2-2' }}</span>
            </div>
          }
          <div class="rt-row rt-total">
            <strong>TOTAL</strong><strong>{{ tx.total | currency:'PHP':'symbol':'1.2-2' }}</strong>
          </div>
          <div class="rt-row">
            <span>Payment</span><span>{{ tx.payment_method | uppercase }}</span>
          </div>
          @if (tx.payment_method === 'cash' && tx.change_due >= 0) {
            <div class="rt-row">
              <span>Tendered</span><span>{{ tx.amount_tendered | currency:'PHP':'symbol':'1.2-2' }}</span>
            </div>
            <div class="rt-row">
              <span>Change</span><span>{{ tx.change_due | currency:'PHP':'symbol':'1.2-2' }}</span>
            </div>
          }
        </div>

        @if (tx.notes) {
          <p class="receipt-notes">{{ tx.notes }}</p>
        }

        <p class="receipt-thanks">Thank you for your laundry! 🧺</p>
      </div>
    </ion-content>

    <ion-header> <!-- bottom toolbar via footer pattern -->
      <ion-toolbar>
        <ion-button expand="block" fill="outline" class="done-btn" (click)="dismiss()">Done</ion-button>
      </ion-toolbar>
    </ion-header>
  `,
  styles: [`
    .receipt { padding: 16px; max-width: 400px; margin: 0 auto; }
    .receipt-header { text-align: center; padding: 8px 0 16px; }
    .receipt-date, .receipt-id { margin: 2px 0; font-size: 0.8rem; opacity: 0.6; }
    .divider { height: 1px; background: var(--ion-border-color); margin: 8px 0; }
    .receipt-items { padding: 12px 0; display: flex; flex-direction: column; gap: 8px; }
    .receipt-item { display: flex; align-items: center; justify-content: space-between; }
    .ri-left { display: flex; flex-direction: column; }
    .ri-name { font-size: 0.9rem; font-weight: 500; }
    .ri-qty { font-size: 0.78rem; opacity: 0.6; }
    .ri-subtotal { font-weight: 600; }
    .receipt-totals { padding: 12px 0; display: flex; flex-direction: column; gap: 6px; }
    .rt-row { display: flex; justify-content: space-between; font-size: 0.9rem; }
    .rt-total { font-size: 1rem; border-top: 1px dashed var(--ion-border-color); padding-top: 6px; margin-top: 4px; }
    .receipt-notes { font-style: italic; font-size: 0.8rem; opacity: 0.6; text-align: center; margin: 8px 0 0; }
    .receipt-thanks { text-align: center; font-size: 0.85rem; opacity: 0.7; margin: 12px 0 0; }
    .done-btn { margin: 8px; }
  `],
})
export class ReceiptModalComponent {
  @Input() tx!: Transaction;

  constructor(private modalCtrl: ModalController) {
    addIcons({ closeOutline, printOutline, waterOutline });
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }
}
