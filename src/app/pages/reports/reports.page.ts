import { Component } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
  IonCardHeader, IonCardTitle, IonSegment, IonSegmentButton, IonLabel,
  IonIcon, IonSpinner, IonRefresher, IonRefresherContent, IonChip,
  IonButtons, IonButton, ToastController
} from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import { trendingUpOutline, trendingDownOutline, removeOutline, downloadOutline, hourglassOutline } from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
import { BrandingService } from '../../services/branding.service';
import { ReportStats, RepeatCustomer } from '../../models/models';
import writeXlsxFile from 'write-excel-file/browser';
import type { Sheet } from 'write-excel-file/browser';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
    IonCardHeader, IonCardTitle, IonSegment, IonSegmentButton, IonLabel,
    IonIcon, IonButtons, IonButton, IonSpinner, IonRefresher, IonRefresherContent, IonChip,
  ],
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
})
export class ReportsPage implements ViewWillEnter {
  period: 'today' | 'week' | 'month' | 'custom' = 'week';
  paymentFilter = 'all';
  dateFrom = new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().substring(0, 10);
  dateTo   = new Date().toISOString().substring(0, 10);
  data: ReportStats | null = null;
  loading = true;
  repeatCustomers: RepeatCustomer[] = [];
  repeatCustomerLimit = 10;
  repeatCustomerPeriod: 'week' | 'month' | 'year' = 'year';
  downloadOutline = downloadOutline;

  readonly paymentMethods = [
    { value: 'all',   label: 'All' },
    { value: 'cash',  label: 'Cash' },
    { value: 'card',  label: 'Card' },
    { value: 'gcash', label: 'GCash' },
  ];

  readonly rcPeriods: { value: 'week' | 'month' | 'year'; label: string }[] = [
    { value: 'week',  label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year',  label: 'Year' },
  ];

  setRcPeriod(value: 'week' | 'month' | 'year'): void {
    this.repeatCustomerPeriod = value;
    this.loadRepeatCustomers();
  }

  constructor(
    private api: DatabaseService,
    private toastCtrl: ToastController,
    public branding: BrandingService,
  ) {
    addIcons({ trendingUpOutline, trendingDownOutline, removeOutline, downloadOutline, hourglassOutline });
  }

  ionViewWillEnter(): void {
    this.load();
  }

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
    this.loadRepeatCustomers();
  }

  loadRepeatCustomers(): void {
    this.api.getTopRepeatCustomers(this.repeatCustomerLimit, this.repeatCustomerPeriod).subscribe({
      next: c => { this.repeatCustomers = c; },
      error: () => { this.repeatCustomers = []; },
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

  personelBarWidth(revenue: number): number {
    if (!this.data || !this.data.personnelBreakdown.length) return 0;
    const max = Math.max(...this.data.personnelBreakdown.map(p => p.revenue), 1);
    return (revenue / max) * 100;
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
      const d = this.data;
      const statusLabel = (s: string) =>
        s === 'must-buy' ? 'Must buy' : s === 'warning' ? '2 days' : s === 'no-sales' ? 'No sales' : 'OK';

      const sheets: Sheet<Blob>[] = [
        {
          sheet: 'Summary',
          data: [
            ['Label', 'Value'],
            ['Report Type', this.periodLabel],
            ['Payment Filter', this.paymentFilter],
            ['From', this.dateFrom ?? ''],
            ['To', this.dateTo ?? ''],
            ['Current Revenue', d.current.revenue],
            ['Current Transactions', d.current.count],
            ['Current Avg Ticket', d.current.avg],
            ['Previous Revenue', d.previous.revenue],
            ['Previous Transactions', d.previous.count],
            ['Previous Avg Ticket', d.previous.avg],
          ],
        },
        {
          sheet: 'Payment Breakdown',
          data: [
            ['Method', 'Revenue', 'Count'],
            ...d.paymentBreakdown.map(p => [p.method, p.revenue, p.count]),
          ],
        },
        {
          sheet: 'Personnel Breakdown',
          data: [
            ['Personnel', 'Revenue', 'Count'],
            ...d.personnelBreakdown.map(p => [p.personel, p.revenue, p.count]),
          ],
        },
        {
          sheet: 'Top Services',
          data: [
            ['Rank', 'Service', 'Quantity', 'Revenue'],
            ...d.topServices.map((s, i) => [i + 1, s.service_name, s.quantity, s.revenue]),
          ],
        },
        {
          sheet: 'Top Products',
          data: [
            ['Rank', 'Product', 'Quantity', 'Revenue'],
            ...d.topProducts.map((p, i) => [i + 1, p.product_name, p.quantity, p.revenue]),
          ],
        },
        {
          sheet: 'Stock Levels',
          data: [
            ['Product', 'Stock', 'Avg Daily Sales', 'Days Remaining', 'Status', 'Price', 'Cost'],
            ...d.stockLevels.map(s => [
              s.product_name, s.stock, s.avgDailySales,
              s.daysRemaining === null ? '\u221e' : s.daysRemaining,
              statusLabel(s.status), s.price, s.cost,
            ]),
          ],
        },
        {
          sheet: 'Breakdown',
          data: [
            ['Label', 'Revenue', 'Count'],
            ...d.breakdown.map(b => [b.label, b.revenue, b.count]),
          ],
        },
        {
          sheet: 'Repeat Customers',
          data: [
            ['Rank', 'Phone Number', 'Visits', 'Total Spent', 'Last Visit'],
            ...this.repeatCustomers.map((c, i) => [i + 1, c.phone_number, c.visit_count, c.total_spent, c.last_visit]),
          ],
        },
      ];

      // writeXlsxFile (browser build) returns a ReturnType with .toBlob()
      const xlsxResult = writeXlsxFile(sheets);
      const blob: Blob = await xlsxResult.toBlob();

      if (Capacitor.isNativePlatform()) {
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
      if (err?.name === 'AbortError') return;
      const toast = await this.toastCtrl.create({
        message: 'Unable to export report. Please try again.',
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    }
  }
}
