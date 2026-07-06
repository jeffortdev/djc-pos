import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
  IonIcon, IonSpinner, IonButton, IonButtons, IonLabel, IonSearchbar,
  IonChip, IonRefresher, IonRefresherContent,
  AlertController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline, trashOutline, gitMergeOutline, warningOutline,
  personOutline, callOutline, refreshOutline,
} from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
import { BrandingService } from '../../services/branding.service';
import { CustomerSummary } from '../../models/models';
import { firstValueFrom } from 'rxjs';

interface DuplicateGroup {
  reason: 'name' | 'phone';
  label: string;
  customers: CustomerSummary[];
}

@Component({
  selector: 'app-customers-admin',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DatePipe, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
    IonIcon, IonSpinner, IonButton, IonButtons, IonLabel, IonSearchbar,
    IonChip, IonRefresher, IonRefresherContent,
  ],
  providers: [AlertController, ToastController],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>
          <div class="title-inner-wrap">
            <img [src]="branding.logoSrc$ | async" alt="logo" class="header-logo">
            @if ((branding.appTitle$ | async) !== 'DJC Point of Sale') {
              <span class="header-title">{{ branding.appTitle$ | async }}</span>
            }
          </div>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="loadAll()" aria-label="Refresh">
            <ion-icon name="refresh-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Duplicates alert section -->
      @if (!loading && duplicates.length > 0) {
        <div class="section-header warn">
          <ion-icon name="warning-outline" color="warning"></ion-icon>
          <span>Possible Duplicates ({{ duplicates.length }})</span>
        </div>
        @for (group of duplicates; track group.label) {
          <ion-card class="dup-card">
            <ion-card-content>
              <div class="dup-reason">
                <ion-chip color="warning" size="small">
                  <ion-label>{{ group.reason === 'name' ? 'Same Name' : 'Similar Phone' }}</ion-label>
                </ion-chip>
                <span class="dup-label">{{ group.label }}</span>
              </div>
              @for (c of group.customers; track c.phone_number) {
                <div class="dup-row">
                  <div class="cust-info">
                    <span class="cust-name">{{ c.customer_name || '(no name)' }}</span>
                    <span class="cust-phone">{{ c.phone_number }}</span>
                  </div>
                  <span class="cust-visits">{{ c.visit_count }} visit{{ c.visit_count !== 1 ? 's' : '' }}</span>
                </div>
              }
              <div class="dup-actions">
                <ion-button fill="outline" size="small" color="warning" (click)="consolidate(group)">
                  <ion-icon name="git-merge-outline" slot="start"></ion-icon>
                  Consolidate
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        }
      }

      <!-- Customer list -->
      <div class="section-header">
        <ion-icon name="people-outline"></ion-icon>
        <span>All Customers ({{ filteredCustomers.length }})</span>
      </div>

      <ion-searchbar
        [(ngModel)]="filterTerm"
        placeholder="Search by name or phone…"
        debounce="200"
        class="cust-search"
      ></ion-searchbar>

      @if (loading) {
        <div class="loading-center">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
      } @else if (filteredCustomers.length === 0) {
        <div class="empty-state">
          <ion-icon name="people-outline"></ion-icon>
          <p>{{ filterTerm ? 'No customers match your search.' : 'No customers with phone numbers found.' }}</p>
        </div>
      } @else {
        <div class="cust-list">
          @for (c of filteredCustomers; track c.phone_number) {
            <ion-card class="cust-card">
              <ion-card-content>
                <div class="cust-row">
                  <div class="cust-main">
                    <span class="cust-name">{{ c.customer_name || '(no name)' }}</span>
                    <div class="cust-meta-row">
                      <ion-icon name="call-outline" class="meta-icon"></ion-icon>
                      <span class="cust-phone">{{ c.phone_number }}</span>
                    </div>
                    <div class="cust-meta-row">
                      <span class="cust-stat">{{ c.visit_count }} visit{{ c.visit_count !== 1 ? 's' : '' }}</span>
                      <span class="cust-sep">·</span>
                      <span class="cust-stat">{{ c.total_spent | currency:'PHP':'symbol':'1.2-2' }} total</span>
                      <span class="cust-sep">·</span>
                      <span class="cust-stat">Last: {{ c.last_visit | date:'mediumDate' }}</span>
                    </div>
                  </div>
                  <ion-button fill="clear" color="danger" (click)="deleteCustomer(c)">
                    <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>
          }
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .title-inner-wrap { display: flex; align-items: center; gap: 8px; }
    .header-logo { height: 28px; width: auto; }
    .header-title { font-size: 0.9rem; font-weight: 600; }

    .loading-center { display: flex; justify-content: center; align-items: center; height: 40vh; }
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 48px; opacity: 0.4; }
    .empty-state ion-icon { font-size: 3rem; }

    .section-header {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px 4px;
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; opacity: 0.6;
    }
    .section-header.warn { opacity: 1; color: var(--ion-color-warning); }
    .section-header ion-icon { font-size: 1rem; }

    .cust-search { padding: 0 8px; }

    .cust-list { padding: 4px 8px 16px; display: flex; flex-direction: column; gap: 6px; }
    .cust-card ion-card-content { padding: 10px 12px; }
    .cust-row { display: flex; align-items: flex-start; gap: 4px; }
    .cust-main { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .cust-name { font-weight: 600; font-size: 0.92rem; }
    .cust-phone { font-size: 0.82rem; opacity: 0.7; }
    .cust-meta-row { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .meta-icon { font-size: 0.8rem; opacity: 0.5; }
    .cust-stat { font-size: 0.75rem; opacity: 0.6; }
    .cust-sep { opacity: 0.3; font-size: 0.75rem; }

    /* Duplicate card */
    .dup-card { margin: 4px 8px; border-left: 3px solid var(--ion-color-warning); }
    .dup-card ion-card-content { padding: 10px 12px; }
    .dup-reason { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .dup-label { font-size: 0.82rem; font-weight: 600; }
    .dup-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid rgba(var(--ion-color-medium-rgb),0.15); }
    .dup-row:last-of-type { border-bottom: none; }
    .dup-row .cust-info { flex: 1; display: flex; flex-direction: column; }
    .dup-row .cust-name { font-size: 0.85rem; font-weight: 600; }
    .dup-row .cust-phone { font-size: 0.76rem; opacity: 0.6; }
    .cust-visits { font-size: 0.76rem; opacity: 0.6; white-space: nowrap; }
    .dup-actions { display: flex; justify-content: flex-end; margin-top: 6px; }
  `],
})
export class CustomersAdminPage implements OnInit {
  customers: CustomerSummary[] = [];
  loading = true;
  filterTerm = '';

  get filteredCustomers(): CustomerSummary[] {
    const term = this.filterTerm.toLowerCase().trim();
    if (!term) return this.customers;
    return this.customers.filter(c =>
      (c.customer_name ?? '').toLowerCase().includes(term) ||
      (c.phone_number ?? '').toLowerCase().includes(term)
    );
  }

  get duplicates(): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];

    // Same name (case-insensitive), multiple phone numbers
    const byName = new Map<string, CustomerSummary[]>();
    for (const c of this.customers) {
      if (!c.customer_name) continue;
      const key = c.customer_name.toLowerCase().trim();
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key)!.push(c);
    }
    for (const [key, list] of byName.entries()) {
      if (list.length > 1) {
        groups.push({ reason: 'name', label: list[0].customer_name, customers: list });
      }
    }

    // Similar phone (same last 7 digits), different phone_number strings
    const byTail = new Map<string, CustomerSummary[]>();
    for (const c of this.customers) {
      const digits = c.phone_number.replace(/\D/g, '');
      if (digits.length < 7) continue;
      const tail = digits.slice(-7);
      if (!byTail.has(tail)) byTail.set(tail, []);
      byTail.get(tail)!.push(c);
    }
    for (const [tail, list] of byTail.entries()) {
      if (list.length > 1) {
        // Only add if not already caught by name grouping
        const already = groups.some(g => g.customers.some(c => list.includes(c)));
        if (!already) {
          groups.push({ reason: 'phone', label: `…${tail}`, customers: list });
        }
      }
    }

    return groups;
  }

  constructor(
    private api: DatabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    public branding: BrandingService,
  ) {
    addIcons({ peopleOutline, trashOutline, gitMergeOutline, warningOutline, personOutline, callOutline, refreshOutline });
  }

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading = true;
    this.api.getAllCustomers().subscribe(list => {
      this.customers = list;
      this.loading = false;
    });
  }

  onRefresh(event: CustomEvent): void {
    this.api.getAllCustomers().subscribe(list => {
      this.customers = list;
      (event.target as HTMLIonRefresherElement).complete();
    });
  }

  async deleteCustomer(c: CustomerSummary): Promise<void> {
    const pinAlert = await this.alertCtrl.create({
      header: 'Enter PIN',
      inputs: [{ name: 'pin', type: 'password', placeholder: 'PIN' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'OK',
          handler: async (data) => {
            const pin = data.pin?.toString() ?? '';
            const stored = await firstValueFrom(this.api.getSetting('register_pin', '1234'));
            if (pin !== stored) {
              const err = await this.alertCtrl.create({ header: 'Incorrect PIN', message: 'The PIN you entered is wrong.', buttons: ['OK'] });
              await err.present();
              return false;
            }

            const confirm = await this.alertCtrl.create({
              header: 'Remove Customer',
              message: `Remove ${c.customer_name || c.phone_number} from all transactions? Their transactions will remain but personal info (name and phone) will be cleared.`,
              buttons: [
                { text: 'Cancel', role: 'cancel' },
                {
                  text: 'Remove', role: 'destructive',
                  handler: () => {
                    this.api.anonymizeCustomer(c.phone_number).subscribe(async () => {
                      this.customers = this.customers.filter(x => x.phone_number !== c.phone_number);
                      const toast = await this.toastCtrl.create({ message: 'Customer removed.', duration: 2000 });
                      await toast.present();
                    });
                  },
                },
              ],
            });
            await confirm.present();
            return true;
          },
        },
      ],
    });
    await pinAlert.present();
  }

  async consolidate(group: DuplicateGroup): Promise<void> {
    const options = group.customers.map((c, i) => ({
      type: 'radio' as const,
      label: `${c.customer_name || '(no name)'} — ${c.phone_number} (${c.visit_count} visits)`,
      value: i.toString(),
      checked: i === 0,
    }));

    const alert = await this.alertCtrl.create({
      header: 'Keep which record?',
      message: 'All other records will be merged into the selected one.',
      inputs: options,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Merge',
          handler: async (idx: string) => {
            const target = group.customers[Number(idx)];
            if (!target) return;

            const pinAlert = await this.alertCtrl.create({
              header: 'Enter PIN to confirm',
              inputs: [{ name: 'pin', type: 'password', placeholder: 'PIN' }],
              buttons: [
                { text: 'Cancel', role: 'cancel' },
                {
                  text: 'OK',
                  handler: async (data) => {
                    const pin = data.pin?.toString() ?? '';
                    const stored = await firstValueFrom(this.api.getSetting('register_pin', '1234'));
                    if (pin !== stored) {
                      const err = await this.alertCtrl.create({ header: 'Incorrect PIN', message: 'The PIN you entered is wrong.', buttons: ['OK'] });
                      await err.present();
                      return false;
                    }

                    const sources = group.customers.filter(c => c.phone_number !== target.phone_number);
                    for (const src of sources) {
                      await firstValueFrom(this.api.mergeCustomers(src.phone_number, target.phone_number, target.customer_name));
                    }
                    this.loadAll();
                    const toast = await this.toastCtrl.create({ message: 'Records merged successfully.', duration: 2000, color: 'success' });
                    await toast.present();
                    return true;
                  },
                },
              ],
            });
            await pinAlert.present();
          },
        },
      ],
    });
    await alert.present();
  }
}
