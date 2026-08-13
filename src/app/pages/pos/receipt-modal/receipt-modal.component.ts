import { Component, Input } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, printOutline, waterOutline } from 'ionicons/icons';
import { Transaction } from '../../../models/models';
import { BrandingService } from '../../../services/branding.service';

@Component({
  selector: 'app-receipt-modal',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DatePipe, UpperCasePipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  ],
  providers: [ModalController],
  templateUrl: './receipt-modal.component.html',
  styleUrls: ['./receipt-modal.component.scss'],
})
export class ReceiptModalComponent {
  @Input() tx!: Transaction;

  constructor(private modalCtrl: ModalController, public branding: BrandingService) {
    addIcons({ closeOutline, printOutline, waterOutline });
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }
}
