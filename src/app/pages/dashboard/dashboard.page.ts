import { Component, OnInit } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
  IonCardHeader, IonCardTitle, IonIcon, IonSpinner, IonChip, IonLabel,
  IonRefresher, IonRefresherContent, IonButton,
  AlertController, ToastController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline, receiptOutline, trendingUpOutline, trendingDownOutline,
  checkmarkCircleOutline, cardOutline, phonePortraitOutline,
  walletOutline, addCircleOutline, removeOutline,
  chatbubbleOutline, trashOutline, hourglassOutline, createOutline, checkmarkDoneOutline,
  shareOutline, callOutline
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { Share } from '@capacitor/share';
import { DatabaseService } from '../../services/database.service';
import { BrandingService } from '../../services/branding.service';
import { MessagingService, MessagingApp } from '../../services/messaging.service';
import { DashboardStats, LoyaltyEntry, ReportStats, Transaction, CartItem } from '../../models/models';
import { LoyaltyTransactionsModalComponent } from './loyalty-transactions-modal/loyalty-transactions-modal.component';
import { ReceiptModalComponent } from '../pos/receipt-modal/receipt-modal.component';
import { PaymentModalComponent } from '../pos/payment-modal/payment-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DatePipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
    IonCardHeader, IonCardTitle, IonIcon, IonSpinner, IonChip, IonLabel,
    IonRefresher, IonRefresherContent, IonButton,
  ],
  providers: [AlertController, ToastController, ModalController],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, ViewWillEnter {
  stats: DashboardStats | null = null;
  loading = true;
  summaryPeriod: 'week' | 'month' = 'week';
  summary: ReportStats | null = null;
  summaryLoading = false;
  loyaltyEntries: LoyaltyEntry[] = [];
  loyaltyLoading = false;
  loyaltyMinVisits = 10;
  pendingOrders: Transaction[] = [];
  pickupOrders: Transaction[] = [];
  actionLoading = false;
  monthlyTarget = 0;
  weekRevenue = 0;
  monthRevenue = 0;
  private _tooltipTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressActive = false;

  get filteredLoyaltyEntries(): LoyaltyEntry[] {
    return this.loyaltyEntries.filter(e => e.visit_count >= this.loyaltyMinVisits);
  }

  get pendingTotal(): number {
    return this.pendingOrders.reduce((sum, tx) => sum + (tx.total ?? 0), 0);
  }

  get dayTarget(): number { return this.monthlyTarget > 0 ? this.monthlyTarget / 30 : 0; }
  get weekTarget(): number { return this.monthlyTarget > 0 ? this.monthlyTarget * 7 / 30 : 0; }
  get pctDay(): number { return this.dayTarget > 0 ? Math.round((this.stats?.revenue ?? 0) / this.dayTarget * 100) : 0; }
  get pctWeek(): number { return this.weekTarget > 0 ? Math.round(this.weekRevenue / this.weekTarget * 100) : 0; }
  get pctMonth(): number { return this.monthlyTarget > 0 ? Math.round(this.monthRevenue / this.monthlyTarget * 100) : 0; }
  targetColor(pct: number): string { return pct >= 100 ? 'success' : pct >= 70 ? 'warning' : 'danger'; }

  constructor(private api: DatabaseService, private alertCtrl: AlertController, private toastCtrl: ToastController, private modalCtrl: ModalController, private router: Router, public branding: BrandingService, private messaging: MessagingService) {
    addIcons({ cashOutline, receiptOutline, trendingUpOutline, trendingDownOutline, checkmarkCircleOutline, cardOutline, phonePortraitOutline, walletOutline, addCircleOutline, removeOutline, chatbubbleOutline, trashOutline, hourglassOutline, createOutline, checkmarkDoneOutline, shareOutline, callOutline });
  }

  ngOnInit(): void { this.load(); this.loadSummary(); this.loadLoyalty(); this.loadActionItems(); this.loadTargetStats(); }

  ionViewWillEnter(): void { this.load(); this.loadSummary(); this.loadLoyalty(); this.loadActionItems(); this.loadTargetStats(); }

  loadTargetStats(): void {
    firstValueFrom(this.api.getSetting('monthly_target', '0')).then(v => {
      this.monthlyTarget = parseFloat(v) || 0;
    });
    this.api.getReportStats('week').subscribe(d => { this.weekRevenue = d.current.revenue; });
    this.api.getReportStats('month').subscribe(d => { this.monthRevenue = d.current.revenue; });
  }

  load(): void {
    this.loading = true;
    this.api.getDashboardToday().subscribe({
      next: s => { this.stats = s; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  loadSummary(): void {
    this.summaryLoading = true;
    this.api.getReportStats(this.summaryPeriod).subscribe({
      next: d => { this.summary = d; this.summaryLoading = false; },
      error: () => { this.summaryLoading = false; },
    });
  }

  setSummaryPeriod(p: 'week' | 'month'): void {
    this.summaryPeriod = p;
    this.loadSummary();
  }

  goToReports(): void {
    this.router.navigate(['/reports']);
  }

  get pctRevenue(): number { return this.summary ? this.calcPct(this.summary.current.revenue, this.summary.previous.revenue) : 0; }
  get pctCount():   number { return this.summary ? this.calcPct(this.summary.current.count,   this.summary.previous.count)   : 0; }
  get pctAvg():     number { return this.summary ? this.calcPct(this.summary.current.avg,     this.summary.previous.avg)     : 0; }

  calcPct(curr: number, prev: number): number {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return parseFloat(((curr - prev) / prev * 100).toFixed(1));
  }

  refresh(event: CustomEvent): void {
    this.load();
    this.loadSummary();
    this.loadActionItems();
    setTimeout(() => (event.target as HTMLIonRefresherElement).complete(), 1000);
  }

  paymentColor(method: string): string {
    return method === 'cash' ? 'success' : method === 'card' ? 'primary' : 'warning';
  }

  async addCash(): Promise<void> {
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
            // verify against stored setting
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
              // Step 2: enter amount
              const cashAlert = await this.alertCtrl.create({
                header: 'Adjust Register Cash',
                subHeader: 'Use a negative value to remove cash',
                inputs: [
                  { name: 'amount', type: 'number', placeholder: 'Amount (PHP), e.g. -50' },
                  { name: 'note', type: 'text', placeholder: 'Note (e.g. Opening float)' },
                ],
                buttons: [
                  { text: 'Cancel', role: 'cancel' },
                  {
                    text: 'Save',
                    handler: (d) => {
                      const amount = parseFloat(d.amount);
                      if (isNaN(amount) || amount === 0) return false;
                      this.api.addRegisterCash(amount, d.note ?? '').subscribe(() => this.load());
                      return true;
                    },
                  },
                ],
              });
              await cashAlert.present();
            });
          },
        },
      ],
    });
    await pinAlert.present();
  }

  loadLoyalty(): void {
    this.loyaltyLoading = true;
    this.api.getSetting('loyalty_min_visits', '10').subscribe(val => {
      this.loyaltyMinVisits = parseInt(val, 10) || 10;
    });
    this.api.getLoyaltyTracking().subscribe({
      next: entries => { this.loyaltyEntries = entries; this.loyaltyLoading = false; },
      error: () => { this.loyaltyLoading = false; },
    });
  }

  onLoyaltyMinVisitsChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val >= 1) {
      this.loyaltyMinVisits = val;
      this.api.setSetting('loyalty_min_visits', val.toString()).subscribe();
    }
  }

  async viewLoyaltyTransactions(entry: LoyaltyEntry): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: LoyaltyTransactionsModalComponent,
      componentProps: { entry },
    });
    await modal.present();
  }

  async notifyLoyalty(entry: LoyaltyEntry): Promise<void> {
    const defaultMsg = 'Hi {{customer_name}}! You have earned a loyalty reward! Visit us to claim your incentive. Thank you!';
    const template = await firstValueFrom(this.api.getSetting('loyalty_sms_message', defaultMsg));
    const message = template
      .replace(/{{\s*customer_name\s*}}/gi, entry.customer_name || entry.phone_number)
      .replace(/{{\s*phone_number\s*}}/gi, entry.phone_number);
    
    await this.showMessagingAppSelector(entry.phone_number, message, 'Send Loyalty Message');
  }

  async clearLoyalty(entry: LoyaltyEntry): Promise<void> {
    const label = entry.customer_name || entry.phone_number;
    const alert = await this.alertCtrl.create({
      header: 'Clear Loyalty',
      message: `Mark incentive as claimed for ${label}? Their visit count will reset to 0.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Clear',
          role: 'destructive',
          handler: () => {
            this.api.redeemLoyalty(entry.phone_number, entry.customer_name).subscribe({
              next: async () => {
                this.loadLoyalty();
                const toast = await this.toastCtrl.create({ message: `Loyalty cleared for ${label}.`, duration: 2000, color: 'success' });
                await toast.present();
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  loadActionItems(): void {
    this.actionLoading = true;
    this.api.getPendingTransactions().subscribe({
      next: pending => {
        this.pendingOrders = pending;
        this.api.getAwaitingPickup().subscribe({
          next: pickup => { this.pickupOrders = pickup; this.actionLoading = false; },
          error: () => { this.actionLoading = false; },
        });
      },
      error: () => { this.actionLoading = false; },
    });
  }

  editPendingOrder(tx: Transaction): void {
    if (this.longPressActive) { this.longPressActive = false; return; }
    this.api.getTransaction(tx.id).subscribe(full => {
      this.router.navigate(['/pos'], { state: { editTx: full } });
    });
  }

  async acceptPendingPayment(tx: Transaction): Promise<void> {
    if (this.longPressActive) { this.longPressActive = false; return; }
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
        showPickupOption: true,
      },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (!data?.confirmed) return;
    const alsoPickUp: boolean = !!data.result.mark_picked_up;
    this.api.acceptPayment(full.id, {
      payment_method: data.result.payment_method,
      amount_tendered: data.result.amount_tendered,
      change_due: data.result.change_due,
    }).subscribe({
      next: async paidTx => {
        this.pendingOrders = this.pendingOrders.filter(t => t.id !== full.id);
        if (alsoPickUp) {
          await firstValueFrom(this.api.markPickedUp(paidTx.id));
          this.load();
          const toast = await this.toastCtrl.create({ message: 'Payment accepted & order marked as picked up!', duration: 2500, color: 'success' });
          await toast.present();
        } else {
          this.pickupOrders = [paidTx, ...this.pickupOrders];
          this.load();
          const toast = await this.toastCtrl.create({ message: 'Payment accepted!', duration: 2500, color: 'success' });
          await toast.present();
        }
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

  async deletePendingOrder(tx: Transaction): Promise<void> {
    if (this.longPressActive) { this.longPressActive = false; return; }
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
              const confirmAlert = await this.alertCtrl.create({
                header: 'Delete Order',
                message: `Delete order #${tx.id}?`,
                buttons: [
                  { text: 'Cancel', role: 'cancel' },
                  {
                    text: 'Delete', role: 'destructive',
                    handler: () => {
                      this.api.deleteTransaction(tx.id).subscribe(async () => {
                        this.pendingOrders = this.pendingOrders.filter(t => t.id !== tx.id);
                        const toast = await this.toastCtrl.create({ message: 'Order deleted', duration: 2000 });
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

  async notifyPickup(tx: Transaction): Promise<void> {
    if (this.longPressActive) { this.longPressActive = false; return; }
    if (!tx.phone_number) {
      const toast = await this.toastCtrl.create({ message: 'No phone number available for this order.', duration: 2000, color: 'warning' });
      await toast.present();
      return;
    }
    const defaultSms = `Hi {{customer_name}}! Your order #{{order_id}} is ready for pickup. Thank you for choosing DJC POS!`;
    const template = await firstValueFrom(this.api.getSetting('sms_message', defaultSms));
    const message = template
      .replace(/{\{\s*order_id\s*\}\}/gi, String(tx.id))
      .replace(/{\{\s*customer_name\s*\}\}/gi, tx.customer_name ?? '');
    
    await this.showMessagingAppSelector(tx.phone_number, message, 'Notify Customer');
    this.api.incrementNotifyCount(tx.id).subscribe(() => {
      tx.notify_count = (tx.notify_count ?? 0) + 1;
    });
  }

  private async showMessagingAppSelector(phoneNumber: string, message: string, title: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: title,
      message: 'Choose how to notify the customer:',
      buttons: [
        {
          text: 'SMS',
          handler: () => {
            this.messaging.openMessagingApp('sms', phoneNumber, message);
          },
        },
        {
          text: 'Viber',
          handler: () => {
            this.messaging.openMessagingApp('viber', phoneNumber, message);
          },
        },
        {
          text: 'Share',
          handler: async () => {
            const fullMessage = `${message}\n\nReply to: ${phoneNumber}`;
            await Share.share({
              title: title,
              text: fullMessage,
            });
          },
        },
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    });
    await alert.present();
  }

  async markPickedUp(tx: Transaction): Promise<void> {
    if (this.longPressActive) { this.longPressActive = false; return; }
    const alert = await this.alertCtrl.create({
      header: 'Mark as Picked Up',
      message: `Confirm order #${tx.id}${tx.customer_name ? ' for ' + tx.customer_name : ''} has been picked up?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Confirm',
          handler: () => {
            this.api.markPickedUp(tx.id).subscribe(async () => {
              this.pickupOrders = this.pickupOrders.filter(t => t.id !== tx.id);
              const toast = await this.toastCtrl.create({ message: `Order #${tx.id} marked as picked up.`, duration: 2000, color: 'success' });
              await toast.present();
            });
          },
        },
      ],
    });
    await alert.present();
  }

  startLongPress(label: string): void {
    this.longPressActive = false;
    this._tooltipTimer = setTimeout(async () => {
      this.longPressActive = true;
      const toast = await this.toastCtrl.create({ message: label, duration: 1200, position: 'bottom' });
      await toast.present();
    }, 600);
  }

  endLongPress(): void {
    if (this._tooltipTimer !== null) {
      clearTimeout(this._tooltipTimer);
      this._tooltipTimer = null;
    }
  }
}
