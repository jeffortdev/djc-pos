import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonSegment, IonSegmentButton, IonInput,
  IonButtons, IonToggle, ModalController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline, cardOutline, phonePortraitOutline,
  checkmarkDoneOutline, closeOutline, swapHorizontalOutline, hourglassOutline
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
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
  personel: string;
  mark_picked_up?: boolean;
}

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonList, IonItem, IonLabel, IonSegment, IonSegmentButton, IonInput,
    IonButtons, IonToggle,
  ],
  providers: [ModalController, AlertController],
  templateUrl: './payment-modal.component.html',
  styleUrls: ['./payment-modal.component.scss'],
})
export class PaymentModalComponent implements OnInit {
  @Input() cart: CartItem[] = [];
  @Input() allowPayLater = true;
  @Input() prefillCustomerName = '';
  @Input() prefillPhone = '';
  @Input() prefillPersonel = '';
  @Input() showPickupOption = false;

  method = 'cash';
  tendered = 0;
  customerName = '';
  phoneNumber = '';
  notes = '';
  personel = '';
  markPickedUpNow = false;
  suggestions: { name: string; phone_number: string }[] = [];

  constructor(
    private modalCtrl: ModalController,
    public branding: BrandingService,
    private db: DatabaseService,
    private alertCtrl: AlertController,
  ) {
    addIcons({ cashOutline, cardOutline, phonePortraitOutline, checkmarkDoneOutline, closeOutline, swapHorizontalOutline, hourglassOutline });
  }

  ngOnInit(): void {
    this.tendered = this.total;
    if (this.prefillCustomerName) this.customerName = this.prefillCustomerName;
    if (this.prefillPhone) this.phoneNumber = this.prefillPhone;
    if (this.prefillPersonel) this.personel = this.prefillPersonel;
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

  /**
   * Before finalizing a payment or pickup registration, check whether this phone number has
   * been recorded under more than one identity in the past — customer_name and notes are both
   * used interchangeably as an identifier since customer_name is optional. If duplicates are
   * found, prompt the cashier to pick a single canonical name and standardize every historical
   * transaction for this phone onto it, so one phone number always maps to exactly one customer.
   * Returns false if the cashier cancels out of the picker, so the caller can abort payment.
   */
  async resolvePhoneDuplicates(): Promise<boolean> {
    const phone = this.phoneNumber.trim();
    if (!phone) return true;

    const identifiers = await firstValueFrom(this.db.getPhoneIdentifiers(phone));
    const currentName = this.customerName.trim();

    const byKey = new Map<string, { identifier: string; count: number }>();
    for (const i of identifiers) byKey.set(i.identifier.toLowerCase(), { ...i });
    if (currentName && !byKey.has(currentName.toLowerCase())) {
      byKey.set(currentName.toLowerCase(), { identifier: currentName, count: 0 });
    }
    const candidates = [...byKey.values()].sort((a, b) => b.count - a.count);

    if (candidates.length <= 1) return true;

    return new Promise<boolean>((resolve) => {
      (async () => {
        const options = candidates.map((c, i) => ({
          type: 'radio' as const,
          label: `${c.identifier}${c.count > 0 ? ` (${c.count} visit${c.count !== 1 ? 's' : ''})` : ' (new)'}`,
          value: c.identifier,
          checked: i === 0,
        }));

        const alert = await this.alertCtrl.create({
          header: 'Duplicate Customer Records',
          message: `This phone number has been used with ${candidates.length} different names/notes. Pick one to keep — all past records will be updated to match.`,
          inputs: options,
          backdropDismiss: false,
          buttons: [
            { text: 'Cancel', role: 'cancel', handler: () => { resolve(false); return true; } },
            {
              text: 'Merge & Continue',
              handler: (chosen: string) => {
                if (!chosen) return false;
                (async () => {
                  this.customerName = chosen;
                  await firstValueFrom(this.db.unifyPhoneIdentity(phone, chosen));
                  resolve(true);
                })();
                return true;
              },
            },
          ],
        });
        await alert.present();
      })();
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

  async confirm(): Promise<void> {
    if (!(await this.resolvePhoneDuplicates())) return;

    const result: PaymentResult = {
      payment_method: this.method,
      amount_tendered: this.method === 'cash' ? this.tendered : this.total,
      change_due: this.method === 'cash' ? this.change : 0,
      customer_name: this.customerName,
      phone_number: this.phoneNumber,
      notes: this.notes,
      personel: this.personel,
      mark_picked_up: this.showPickupOption ? this.markPickedUpNow : false,
    };
    this.modalCtrl.dismiss({ confirmed: true, result });
  }

  async registerPickup(): Promise<void> {
    if (!(await this.resolvePhoneDuplicates())) return;

    this.modalCtrl.dismiss({
      confirmed: true,
      payLater: true,
      result: {
        customer_name: this.customerName,
        phone_number: this.phoneNumber,
        notes: this.notes,
        personel: this.personel,
      },
    });
  }
}
