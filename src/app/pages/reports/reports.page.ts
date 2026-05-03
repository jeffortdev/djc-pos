import { Component } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
  IonCardHeader, IonCardTitle, IonSegment, IonSegmentButton, IonLabel,
  IonIcon, IonSpinner, IonRefresher, IonRefresherContent, IonChip,
  IonButtons, IonButton, AlertController, ToastController
} from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import { trendingUpOutline, trendingDownOutline, removeOutline, downloadOutline } from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
import { ReportStats } from '../../models/models';
import writeXlsxFile, { Schema } from 'write-excel-file';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
    IonCardHeader, IonCardTitle, IonSegment, IonSegmentButton, IonLabel,
    IonIcon, IonButtons, IonButton, IonSpinner, IonRefresher, IonRefresherContent, IonChip,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>
          <img src="assets/logo.svg" alt="DJC Point of Sale" class="header-logo">
        </ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="exportReport()">
            <ion-icon slot="icon-only" [icon]="downloadOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar color="primary">
        <ion-segment [(ngModel)]="period" (ionChange)="onFilterChange()">
          <ion-segment-button value="today"><ion-label>Today</ion-label></ion-segment-button>
          <ion-segment-button value="week"><ion-label>Week</ion-label></ion-segment-button>
          <ion-segment-button value="month"><ion-label>Month</ion-label></ion-segment-button>
          <ion-segment-button value="custom"><ion-label>Custom</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Custom date range picker -->
      @if (period === 'custom') {
        <div class="date-range-bar">
          <div class="date-field">
            <label>From</label>
            <input type="date" class="date-input" [(ngModel)]="dateFrom" (change)="onFilterChange()">
          </div>
          <span class="date-arrow">→</span>
          <div class="date-field">
            <label>To</label>
            <input type="date" class="date-input" [(ngModel)]="dateTo" (change)="onFilterChange()">
          </div>
        </div>
      }

      <!-- Payment method filter chips -->
      <div class="filter-chips">
        @for (m of paymentMethods; track m.value) {
          <ion-chip
            [color]="paymentFilter === m.value ? 'primary' : 'medium'"
            (click)="setPaymentFilter(m.value)">
            <ion-label>{{ m.label }}</ion-label>
          </ion-chip>
        }
      </div>

      @if (loading) {
        <div class="loading-center"><ion-spinner name="crescent"></ion-spinner></div>
      } @else if (data) {

        <!-- Payment method breakdown (always unfiltered — shows full split) -->
        @if (data.paymentBreakdown.length > 0) {
          <ion-card>
            <ion-card-header>
              <ion-card-title>Payment Split</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="pm-list">
                @for (pm of data.paymentBreakdown; track pm.method) {
                  <div class="pm-row">
                    <ion-chip [color]="pmColor(pm.method)" size="small">
                      <ion-label>{{ pm.method | titlecase }}</ion-label>
                    </ion-chip>
                    <div class="pm-bar-wrap">
                      <div class="pm-bar" [style.width.%]="pmBarWidth(pm.revenue)" [style.background]="pmBarColor(pm.method)"></div>
                    </div>
                    <span class="pm-count">{{ pm.count }}x</span>
                    <span class="pm-rev">{{ pm.revenue | currency:'PHP':'symbol':'1.2-2' }}</span>
                  </div>
                }
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- Comparison cards -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>vs Previous {{ periodLabel }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="cmp-grid">
              <div class="cmp-item">
                <div class="cmp-curr">{{ data.current.revenue | currency:'PHP':'symbol':'1.2-2' }}</div>
                <div class="cmp-prev">prev: {{ data.previous.revenue | currency:'PHP':'symbol':'1.2-2' }}</div>
                <div class="cmp-badge"
                     [class.up]="pct(data.current.revenue, data.previous.revenue) >= 0"
                     [class.down]="pct(data.current.revenue, data.previous.revenue) < 0">
                  <ion-icon [name]="pctIcon(data.current.revenue, data.previous.revenue)"></ion-icon>
                  {{ pctLabel(data.current.revenue, data.previous.revenue) }}
                </div>
                <div class="cmp-lbl">Revenue</div>
              </div>
              <div class="cmp-item">
                <div class="cmp-curr">{{ data.current.count }}</div>
                <div class="cmp-prev">prev: {{ data.previous.count }}</div>
                <div class="cmp-badge"
                     [class.up]="pct(data.current.count, data.previous.count) >= 0"
                     [class.down]="pct(data.current.count, data.previous.count) < 0">
                  <ion-icon [name]="pctIcon(data.current.count, data.previous.count)"></ion-icon>
                  {{ pctLabel(data.current.count, data.previous.count) }}
                </div>
                <div class="cmp-lbl">Transactions</div>
              </div>
              <div class="cmp-item">
                <div class="cmp-curr">{{ data.current.avg | currency:'PHP':'symbol':'1.2-2' }}</div>
                <div class="cmp-prev">prev: {{ data.previous.avg | currency:'PHP':'symbol':'1.2-2' }}</div>
                <div class="cmp-badge"
                     [class.up]="pct(data.current.avg, data.previous.avg) >= 0"
                     [class.down]="pct(data.current.avg, data.previous.avg) < 0">
                  <ion-icon [name]="pctIcon(data.current.avg, data.previous.avg)"></ion-icon>
                  {{ pctLabel(data.current.avg, data.previous.avg) }}
                </div>
                <div class="cmp-lbl">Avg Ticket</div>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Bar chart -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ period === 'today' ? 'Hourly Revenue' : 'Daily Revenue' }}</ion-card-title>
          </ion-card-header>
          <ion-card-content class="chart-content">
            <div class="bar-chart">
              @for (bar of data.breakdown; track bar.label) {
                <div class="bar-col">
                  <div class="bar-amount">{{ bar.revenue > 0 ? (bar.revenue | currency:'PHP':'symbol':'1.0-0') : '' }}</div>
                  <div class="bar-outer">
                    <div class="bar-fill" [style.height.%]="barHeight(bar.revenue)"></div>
                  </div>
                  <div class="bar-lbl">{{ bar.label }}</div>
                </div>
              }
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Top services -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Top Services</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            @if (data.topServices.length === 0) {
              <p class="empty">No service sales this period.</p>
            }
            @for (svc of data.topServices; track svc.service_name; let i = $index) {
              <div class="top-row">
                <span class="rank">#{{ i + 1 }}</span>
                <span class="svc-name">{{ svc.service_name }}</span>
                <ion-chip color="primary" size="small"><ion-label>{{ svc.quantity }}x</ion-label></ion-chip>
                <span class="svc-rev">{{ svc.revenue | currency:'PHP':'symbol':'1.2-2' }}</span>
              </div>
            }
          </ion-card-content>
        </ion-card>

        <!-- Top products -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Top Products</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            @if (data.topProducts.length === 0) {
              <p class="empty">No product sales this period.</p>
            }
            @for (prod of data.topProducts; track prod.product_name; let i = $index) {
              <div class="top-row">
                <span class="rank">#{{ i + 1 }}</span>
                <span class="svc-name">{{ prod.product_name }}</span>
                <ion-chip color="secondary" size="small"><ion-label>{{ prod.quantity }}x</ion-label></ion-chip>
                <span class="svc-rev">{{ prod.revenue | currency:'PHP':'symbol':'1.2-2' }}</span>
              </div>
            }
          </ion-card-content>
        </ion-card>

        <!-- Stock levels -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Current Stock Levels</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            @if (data.stockLevels.length === 0) {
              <p class="empty">No products available.</p>
            } @else {
              <div class="stock-table">
                <div class="stock-table-row stock-table-header">
                  <span>Product</span>
                  <span>Stock</span>
                  <span>Avg/day</span>
                  <span>Days left</span>
                  <span>Status</span>
                </div>
                @for (stock of data.stockLevels; track stock.product_name) {
                  <div class="stock-table-row">
                    <span class="stock-name">{{ stock.product_name }}</span>
                    <span class="stock-value">{{ stock.stock }} pcs</span>
                    <span>{{ stock.avgDailySales > 0 ? (stock.avgDailySales | number:'1.1-1') : '0' }}</span>
                    <span>{{ stock.daysRemaining !== null ? stock.daysRemaining : '∞' }}</span>
                    <span class="stock-status" [class.must-buy]="stock.status === 'must-buy'" [class.warning]="stock.status === 'warning'">{{ stock.status === 'must-buy' ? 'Must buy' : stock.status === 'warning' ? '2 days' : stock.status === 'no-sales' ? 'No sales' : 'OK' }}</span>
                  </div>
                }
              </div>
            }
          </ion-card-content>
        </ion-card>
      }
    </ion-content>
  `,
  styles: [`
    .loading-center { display: flex; justify-content: center; align-items: center; height: 60vh; }

    /* Date range bar */
    .date-range-bar { display: flex; align-items: center; gap: 8px; padding: 10px 16px 4px; }
    .date-field { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .date-field label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.55; }
    .date-input { width: 100%; border: 1px solid var(--ion-color-medium); border-radius: 8px; padding: 6px 8px; font-size: 0.88rem; background: var(--ion-background-color); color: var(--ion-text-color); }
    .date-arrow { opacity: 0.4; font-size: 1.1rem; }

    /* Payment filter chips */
    .filter-chips { display: flex; gap: 6px; padding: 8px 16px 4px; flex-wrap: wrap; }

    /* Payment split */
    .pm-list { display: flex; flex-direction: column; gap: 8px; }
    .pm-row { display: flex; align-items: center; gap: 8px; }
    .pm-bar-wrap { flex: 1; height: 8px; background: rgba(var(--ion-color-medium-rgb),0.2); border-radius: 4px; overflow: hidden; }
    .pm-bar { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
    .pm-count { font-size: 0.75rem; opacity: 0.6; min-width: 28px; text-align: right; }
    .pm-rev { font-weight: 700; font-size: 0.85rem; white-space: nowrap; min-width: 80px; text-align: right; }

    /* Comparison grid */
    .cmp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
    .cmp-item { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 6px 2px; }
    .cmp-curr { font-size: 0.9rem; font-weight: 700; }
    .cmp-prev { font-size: 0.65rem; opacity: 0.55; margin: 2px 0; }
    .cmp-badge { display: flex; align-items: center; gap: 2px; font-size: 0.75rem; font-weight: 600; padding: 2px 6px; border-radius: 12px; }
    .cmp-badge.up   { color: var(--ion-color-success); background: rgba(var(--ion-color-success-rgb),0.12); }
    .cmp-badge.down { color: var(--ion-color-danger);  background: rgba(var(--ion-color-danger-rgb),0.12); }
    .cmp-lbl { font-size: 0.65rem; opacity: 0.6; margin-top: 4px; }

    /* Bar chart */
    .chart-content { --padding-bottom: 0; }
    .bar-chart { display: flex; align-items: flex-end; gap: 3px; height: 140px; padding-bottom: 20px; overflow-x: auto; }
    .bar-col { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 28px; height: 100%; }
    .bar-amount { font-size: 0.5rem; color: var(--ion-color-medium); height: 16px; text-align: center; overflow: hidden; }
    .bar-outer { flex: 1; width: 100%; display: flex; align-items: flex-end; background: rgba(var(--ion-color-primary-rgb),0.1); border-radius: 3px 3px 0 0; }
    .bar-fill { width: 100%; background: var(--ion-color-primary); border-radius: 3px 3px 0 0; min-height: 2px; transition: height 0.3s ease; }
    .bar-lbl { font-size: 0.6rem; opacity: 0.7; margin-top: 2px; text-align: center; height: 18px; }

    /* Top services */
    .top-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--ion-border-color); }
    .rank { font-weight: 700; opacity: 0.4; min-width: 24px; }
    .svc-name { flex: 1; font-size: 0.9rem; }
    .svc-rev { font-weight: 700; white-space: nowrap; }
    .stock-table { display: grid; gap: 6px; }
    .stock-table-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 8px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--ion-border-color); }
    .stock-table-header { font-weight: 700; color: var(--ion-color-medium); border-bottom: 1px solid var(--ion-color-medium); }
    .stock-table-row span { font-size: 0.9rem; }
    .stock-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .stock-value, .stock-price { text-align: right; }
    .stock-status { display: inline-flex; justify-content: center; align-items: center; padding: 2px 6px; border-radius: 10px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
    .stock-status.must-buy { background: rgba(var(--ion-color-danger-rgb),0.15); color: var(--ion-color-danger); }
    .stock-status.warning { background: rgba(var(--ion-color-warning-rgb),0.15); color: var(--ion-color-warning); }
    .stock-status:not(.must-buy):not(.warning) { background: rgba(var(--ion-color-medium-rgb),0.12); color: var(--ion-color-medium); }
    .empty { opacity: 0.5; text-align: center; padding: 16px; }
  `],
})
export class ReportsPage implements ViewWillEnter {
  period: 'today' | 'week' | 'month' | 'custom' = 'week';
  paymentFilter = 'all';
  dateFrom = new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().substring(0, 10);
  dateTo   = new Date().toISOString().substring(0, 10);
  data: ReportStats | null = null;
  loading = true;
  downloadOutline = downloadOutline;

  readonly paymentMethods = [
    { value: 'all',   label: 'All' },
    { value: 'cash',  label: 'Cash' },
    { value: 'card',  label: 'Card' },
    { value: 'gcash', label: 'GCash' },
  ];

  constructor(
    private api: DatabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ trendingUpOutline, trendingDownOutline, removeOutline, downloadOutline });
  }

  ionViewWillEnter(): void { this.load(); }

  get periodLabel(): string {
    return { today: 'Day', week: 'Week', month: 'Month', custom: 'Period' }[this.period];
  }

  onFilterChange(): void { this.load(); }

  setPaymentFilter(value: string): void {
    this.paymentFilter = value;
    this.load();
  }

  load(): void {
    if (this.period === 'custom' && (!this.dateFrom || !this.dateTo)) return;
    this.loading = true;
    this.api.getReportStats(this.period, this.paymentFilter, this.dateFrom, this.dateTo).subscribe({
      next: d => { this.data = d; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  refresh(event: CustomEvent): void {
    this.load();
    setTimeout(() => (event.target as HTMLIonRefresherElement).complete(), 1000);
  }

  barHeight(revenue: number): number {
    if (!this.data || !this.data.breakdown.length) return 0;
    const max = Math.max(...this.data.breakdown.map(b => b.revenue), 1);
    return (revenue / max) * 100;
  }

  pmBarWidth(revenue: number): number {
    if (!this.data || !this.data.paymentBreakdown.length) return 0;
    const max = Math.max(...this.data.paymentBreakdown.map(p => p.revenue), 1);
    return (revenue / max) * 100;
  }

  pmColor(method: string): string {
    return method === 'cash' ? 'success' : method === 'card' ? 'primary' : 'warning';
  }

  pmBarColor(method: string): string {
    return method === 'cash' ? 'var(--ion-color-success)' : method === 'card' ? 'var(--ion-color-primary)' : 'var(--ion-color-warning)';
  }

  pct(curr: number, prev: number): number {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return parseFloat(((curr - prev) / prev * 100).toFixed(1));
  }

  pctLabel(curr: number, prev: number): string {
    if (prev === 0 && curr === 0) return '—';
    const p = this.pct(curr, prev);
    return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
  }

  pctIcon(curr: number, prev: number): string {
    const p = this.pct(curr, prev);
    return p > 0 ? 'trending-up-outline' : p < 0 ? 'trending-down-outline' : 'remove-outline';
  }

  async exportReport(): Promise<void> {
    if (!this.data) return;

    const fileName = `DJC_POS_Report_${this.period}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    try {
      // Build sheets as row arrays — write-excel-file is browser/WebView native
      const summarySchema: Schema<{ label: string; value: string | number }> = [
        { column: 'Label', type: String, value: r => String(r.label) },
        { column: 'Value', type: String, value: r => String(r.value) },
      ];
      const summaryData: { label: string; value: string | number }[] = [
        { label: 'Report Type', value: this.periodLabel },
        { label: 'Payment Filter', value: this.paymentFilter },
        { label: 'From', value: this.dateFrom ?? '' },
        { label: 'To', value: this.dateTo ?? '' },
        { label: 'Current Revenue', value: this.data.current.revenue },
        { label: 'Current Transactions', value: this.data.current.count },
        { label: 'Current Avg Ticket', value: this.data.current.avg },
        { label: 'Previous Revenue', value: this.data.previous.revenue },
        { label: 'Previous Transactions', value: this.data.previous.count },
        { label: 'Previous Avg Ticket', value: this.data.previous.avg },
      ];

      const pmSchema: Schema<{ method: string; revenue: number; count: number }> = [
        { column: 'Method',  type: String, value: r => r.method },
        { column: 'Revenue', type: Number, value: r => r.revenue },
        { column: 'Count',   type: Number, value: r => r.count },
      ];

      const svcSchema: Schema<{ rank: number; service_name: string; quantity: number; revenue: number }> = [
        { column: 'Rank',     type: Number, value: r => r.rank },
        { column: 'Service',  type: String, value: r => r.service_name },
        { column: 'Quantity', type: Number, value: r => r.quantity },
        { column: 'Revenue',  type: Number, value: r => r.revenue },
      ];

      const prodSchema: Schema<{ rank: number; product_name: string; quantity: number; revenue: number }> = [
        { column: 'Rank',     type: Number, value: r => r.rank },
        { column: 'Product',  type: String, value: r => r.product_name },
        { column: 'Quantity', type: Number, value: r => r.quantity },
        { column: 'Revenue',  type: Number, value: r => r.revenue },
      ];

      type StockRow = { product_name: string; stock: number; avgDailySales: number; daysRemaining: number | null; status: string; price: number; cost: number };
      const stockSchema: Schema<StockRow> = [
        { column: 'Product',        type: String, value: r => r.product_name },
        { column: 'Stock',          type: Number, value: r => r.stock },
        { column: 'Avg Daily Sales',type: Number, value: r => r.avgDailySales },
        { column: 'Days Remaining', type: String, value: r => r.daysRemaining === null ? '∞' : String(r.daysRemaining) },
        { column: 'Status',         type: String, value: r => r.status === 'must-buy' ? 'Must buy' : r.status === 'warning' ? '2 days' : r.status === 'no-sales' ? 'No sales' : 'OK' },
        { column: 'Price',          type: Number, value: r => r.price },
        { column: 'Cost',           type: Number, value: r => r.cost },
      ];

      const bdSchema: Schema<{ label: string; revenue: number; count: number }> = [
        { column: 'Label',   type: String, value: r => r.label },
        { column: 'Revenue', type: Number, value: r => r.revenue },
        { column: 'Count',   type: Number, value: r => r.count },
      ];

      const blob: Blob = await writeXlsxFile(
        [
          summaryData,
          this.data.paymentBreakdown,
          this.data.topServices.map((s, i) => ({ rank: i + 1, ...s })),
          this.data.topProducts.map((p, i) => ({ rank: i + 1, ...p })),
          this.data.stockLevels as StockRow[],
          this.data.breakdown,
        ] as any,
        {
          sheets: ['Summary', 'Payment Breakdown', 'Top Services', 'Top Products', 'Stock Levels', 'Breakdown'],
          schema: [summarySchema, pmSchema, svcSchema, prodSchema, stockSchema, bdSchema] as any,
        }
      );

      if (Capacitor.isNativePlatform()) {
        // Native Android/iOS: write to cache dir, then open OS share/save sheet
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        const arrayBuffer = await blob.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        const binary = Array.from(uint8).reduce((s, b) => s + String.fromCharCode(b), '');
        const base64 = btoa(binary);
        await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
        const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
        await Share.share({ title: 'DJC POS Report', files: [uri] });
      } else {
        // Web browser — File System Access API (Chrome/Edge), then anchor-click fallback
        const blobTyped = new Blob([blob], { type: xlsxMime });
        if ('showSaveFilePicker' in window) {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: 'Excel Workbook', accept: { [xlsxMime]: ['.xlsx'] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blobTyped);
          await writable.close();
        } else {
          const url = URL.createObjectURL(blobTyped);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = fileName;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          URL.revokeObjectURL(url);
        }
        const toast = await this.toastCtrl.create({
          message: 'Report exported successfully.',
          duration: 2500,
          color: 'success',
        });
        await toast.present();
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // User dismissed the share sheet — not an error
      const toast = await this.toastCtrl.create({
        message: 'Unable to export report. Please try again.',
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    }
  }
}
