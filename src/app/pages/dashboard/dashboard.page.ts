import { Component, OnInit } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
  IonCardHeader, IonCardTitle, IonIcon, IonSpinner, IonChip, IonLabel,
  IonRefresher, IonRefresherContent, IonButton,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline, receiptOutline, trendingUpOutline, trendingDownOutline,
  checkmarkCircleOutline, cardOutline, phonePortraitOutline,
  walletOutline, addCircleOutline, removeOutline
} from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
import { DashboardStats, ReportStats } from '../../models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DatePipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
    IonCardHeader, IonCardTitle, IonIcon, IonSpinner, IonChip, IonLabel,
    IonRefresher, IonRefresherContent, IonButton,
  ],
  providers: [AlertController],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>
          <img src="assets/logo.svg" alt="DJC POS" class="header-logo">
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (loading) {
        <div class="loading-center">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
      } @else if (stats) {
        <!-- Register balance -->
        <ion-card class="register-card">
          <ion-card-content>
            <div class="register-row">
              <div class="register-info">
                <ion-icon name="wallet-outline" class="register-icon" color="success"></ion-icon>
                <div>
                  <div class="register-value">{{ stats.register_balance | currency:'PHP':'symbol':'1.2-2' }}</div>
                  <div class="register-label">Cash in Register</div>
                </div>
              </div>
              <ion-button size="small" fill="outline" color="success" (click)="addCash()">
                <ion-icon name="add-circle-outline" slot="start"></ion-icon>
                Add Cash
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- KPI cards -->
        <div class="kpi-grid">
          <ion-card class="kpi-card">
            <ion-card-content>
              <ion-icon name="cash-outline" color="success" class="kpi-icon"></ion-icon>
              <div class="kpi-value">{{ stats.revenue | currency:'PHP':'symbol':'1.2-2' }}</div>
              <div class="kpi-label">Revenue</div>
            </ion-card-content>
          </ion-card>
          <ion-card class="kpi-card">
            <ion-card-content>
              <ion-icon name="receipt-outline" color="primary" class="kpi-icon"></ion-icon>
              <div class="kpi-value">{{ stats.transaction_count }}</div>
              <div class="kpi-label">Transactions</div>
            </ion-card-content>
          </ion-card>
          <ion-card class="kpi-card">
            <ion-card-content>
              <ion-icon name="trending-up-outline" color="warning" class="kpi-icon"></ion-icon>
              <div class="kpi-value">{{ stats.avg_ticket | currency:'PHP':'symbol':'1.2-2' }}</div>
              <div class="kpi-label">Avg Ticket</div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Sales Summary -->
        <ion-card>
          <ion-card-header>
            <div class="sum-header">
              <ion-card-title>Sales Summary</ion-card-title>
              <div class="sum-period">
                <button class="per-btn" [class.active]="summaryPeriod==='week'" (click)="setSummaryPeriod('week')">Week</button>
                <button class="per-btn" [class.active]="summaryPeriod==='month'" (click)="setSummaryPeriod('month')">Month</button>
              </div>
            </div>
          </ion-card-header>
          <ion-card-content>
            @if (summaryLoading) {
              <div class="sum-loading"><ion-spinner name="dots"></ion-spinner></div>
            } @else if (summary) {
              <div class="sum-grid">
                <div class="sum-item">
                  <span class="sum-val">{{ summary.current.revenue | currency:'PHP':'symbol':'1.0-0' }}</span>
                  <span class="sum-badge" [class.up]="pctRevenue >= 0" [class.down]="pctRevenue < 0">
                    <ion-icon [name]="pctRevenue >= 0 ? 'trending-up-outline' : 'trending-down-outline'"></ion-icon>
                    {{ pctRevenue >= 0 ? '+' : '' }}{{ pctRevenue | number:'1.0-0' }}%
                  </span>
                  <span class="sum-lbl">Revenue</span>
                </div>
                <div class="sum-item">
                  <span class="sum-val">{{ summary.current.count }}</span>
                  <span class="sum-badge" [class.up]="pctCount >= 0" [class.down]="pctCount < 0">
                    <ion-icon [name]="pctCount >= 0 ? 'trending-up-outline' : 'trending-down-outline'"></ion-icon>
                    {{ pctCount >= 0 ? '+' : '' }}{{ pctCount | number:'1.0-0' }}%
                  </span>
                  <span class="sum-lbl">Transactions</span>
                </div>
                <div class="sum-item">
                  <span class="sum-val">{{ summary.current.avg | currency:'PHP':'symbol':'1.0-0' }}</span>
                  <span class="sum-badge" [class.up]="pctAvg >= 0" [class.down]="pctAvg < 0">
                    <ion-icon [name]="pctAvg >= 0 ? 'trending-up-outline' : 'trending-down-outline'"></ion-icon>
                    {{ pctAvg >= 0 ? '+' : '' }}{{ pctAvg | number:'1.0-0' }}%
                  </span>
                  <span class="sum-lbl">Avg Ticket</span>
                </div>
              </div>
              <div class="sum-footer">
                <span class="prev-lbl">vs prev. {{ summaryPeriod === 'week' ? 'week' : 'month' }}:
                  {{ summary.previous.revenue | currency:'PHP':'symbol':'1.0-0' }}</span>
                <button class="report-link" (click)="goToReports()">Full Report →</button>
              </div>
            }
          </ion-card-content>
        </ion-card>

        <!-- Top services -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Top Services Today</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            @if (stats.topServices.length === 0) {
              <p class="empty">No sales yet today.</p>
            }
            @for (svc of stats.topServices; track svc.service_name; let i = $index) {
              <div class="top-svc-row">
                <span class="rank">#{{ i + 1 }}</span>
                <span class="svc-name">{{ svc.service_name }}</span>
                <ion-chip color="primary" size="small">
                  <ion-label>{{ svc.quantity }}x</ion-label>
                </ion-chip>
                <span class="svc-rev">{{ svc.revenue | currency:'PHP':'symbol':'1.2-2' }}</span>
              </div>
            }
          </ion-card-content>
        </ion-card>

        <!-- Recent transactions -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Recent Transactions</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            @if (stats.recentTransactions.length === 0) {
              <p class="empty">No transactions yet.</p>
            }
            @for (tx of stats.recentTransactions; track tx.id) {
              <div class="recent-tx">
                <div class="tx-left">
                  <span class="tx-id"># {{ tx.id }}</span>
                  <span class="tx-time">{{ tx.created_at | date:'shortTime' }}</span>
                </div>
                <ion-chip [color]="paymentColor(tx.payment_method)" size="small">
                  <ion-label>{{ tx.payment_method }}</ion-label>
                </ion-chip>
                <span class="tx-total">{{ tx.total | currency:'PHP':'symbol':'1.2-2' }}</span>
              </div>
            }
          </ion-card-content>
        </ion-card>
      }
    </ion-content>
  `,
  styles: [`
    .loading-center { display: flex; justify-content: center; align-items: center; height: 60vh; }
    .register-card { margin: 8px 8px 4px; }
    .register-row { display: flex; align-items: center; justify-content: space-between; }
    .register-info { display: flex; align-items: center; gap: 12px; }
    .register-icon { font-size: 2.4rem; }
    .register-value { font-size: 1.5rem; font-weight: 700; color: var(--ion-color-success); }
    .register-label { font-size: 0.72rem; opacity: 0.6; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 8px; }
    .kpi-card ion-card-content { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 12px 8px; }
    .kpi-icon { font-size: 2rem; margin-bottom: 4px; }
    .kpi-value { font-size: 1.1rem; font-weight: 700; }
    .kpi-label { font-size: 0.7rem; opacity: 0.6; }
    .top-svc-row, .recent-tx { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--ion-border-color); }
    .rank { font-weight: 700; opacity: 0.4; min-width: 24px; }
    .svc-name { flex: 1; font-size: 0.9rem; }
    .tx-left { flex: 1; display: flex; flex-direction: column; }
    .tx-id { font-weight: 600; font-size: 0.9rem; }
    .tx-time { font-size: 0.72rem; opacity: 0.55; }
    .svc-rev, .tx-total { font-weight: 700; white-space: nowrap; }
    .sum-header { display: flex; align-items: center; justify-content: space-between; }
    .sum-period { display: flex; gap: 4px; }
    .per-btn { background: none; border: 1px solid var(--ion-color-medium); border-radius: 12px; padding: 4px 10px; font-size: 0.75rem; cursor: pointer; color: var(--ion-color-medium); }
    .per-btn.active { background: var(--ion-color-primary); border-color: var(--ion-color-primary); color: #fff; }
    .sum-loading { display: flex; justify-content: center; padding: 12px; }
    .sum-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
    .sum-item { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .sum-val { font-size: 0.95rem; font-weight: 700; }
    .sum-badge { display: flex; align-items: center; gap: 2px; font-size: 0.72rem; font-weight: 600; padding: 2px 6px; border-radius: 12px; margin: 2px 0; }
    .sum-badge.up   { color: var(--ion-color-success); background: rgba(var(--ion-color-success-rgb),0.12); }
    .sum-badge.down { color: var(--ion-color-danger);  background: rgba(var(--ion-color-danger-rgb),0.12); }
    .sum-lbl { font-size: 0.65rem; opacity: 0.6; }
    .sum-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--ion-border-color); }
    .prev-lbl { font-size: 0.72rem; opacity: 0.55; }
    .report-link { background: none; border: none; color: var(--ion-color-primary); font-size: 0.8rem; font-weight: 600; cursor: pointer; padding: 4px; }
    @media (max-width: 360px) {
      .kpi-value { font-size: 0.9rem; }
    }
  `],
})
export class DashboardPage implements OnInit, ViewWillEnter {
  stats: DashboardStats | null = null;
  loading = true;
  summaryPeriod: 'week' | 'month' = 'week';
  summary: ReportStats | null = null;
  summaryLoading = false;

  constructor(private api: DatabaseService, private alertCtrl: AlertController, private router: Router) {
    addIcons({ cashOutline, receiptOutline, trendingUpOutline, trendingDownOutline, checkmarkCircleOutline, cardOutline, phonePortraitOutline, walletOutline, addCircleOutline, removeOutline });
  }

  ngOnInit(): void { this.load(); this.loadSummary(); }

  ionViewWillEnter(): void { this.load(); this.loadSummary(); }

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
}
