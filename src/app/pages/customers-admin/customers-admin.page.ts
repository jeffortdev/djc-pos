import { Component, OnInit } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
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
  personOutline, callOutline, refreshOutline, createOutline, closeCircleOutline, searchOutline,
} from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
import { BrandingService } from '../../services/branding.service';
import { CustomerSummary } from '../../models/models';
import { firstValueFrom, forkJoin } from 'rxjs';

interface DuplicateGroup {
  reason: 'name' | 'phone' | 'phone-name';
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
  templateUrl: './customers-admin.page.html',
  styleUrls: ['./customers-admin.page.scss'],
})
export class CustomersAdminPage implements OnInit, ViewWillEnter {
  customers: CustomerSummary[] = [];
  orphanCustomers: CustomerSummary[] = [];
  phoneNameConflicts: { phone_number: string; identifiers: { identifier: string; count: number }[] }[] = [];
  scanningPhoneConflicts = false;
  phoneConflictsScanned = false;
  loading = true;
  filterTerm = '';
  dismissedGroups = new Set<string>();

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

    // Same name (case-insensitive), multiple phone numbers — also scans walk-in transactions
    // that never had a phone number recorded, so those aren't silently excluded from the scan.
    const combined: CustomerSummary[] = [...this.customers, ...this.orphanCustomers];
    const byName = new Map<string, CustomerSummary[]>();
    for (const c of combined) {
      if (!c.customer_name) continue;
      const key = c.customer_name.toLowerCase().trim();
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key)!.push(c);
    }
    for (const [key, list] of byName.entries()) {
      if (list.length > 1) {
        // Put entries that have a phone number first so Consolidate defaults to keeping one of
        // those (merging into a phone-less record would strip the phone from all sources).
        list.sort((a, b) => (a.phone_number ? 0 : 1) - (b.phone_number ? 0 : 1));
        groups.push({ reason: 'name', label: list[0].customer_name, customers: list });
      }
    }

    // Similar phone (same last 10 digits), different phone_number strings
    const byTail = new Map<string, CustomerSummary[]>();
    for (const c of this.customers) {
      const digits = c.phone_number.replace(/\D/g, '');
      if (digits.length < 10) continue;
      const tail = digits.slice(-10);
      if (!byTail.has(tail)) byTail.set(tail, []);
      byTail.get(tail)!.push(c);
    }
    for (const [tail, list] of byTail.entries()) {
      if (list.length > 1) {
        // Only skip if all members of this list are already covered in the same existing group
        const fullyConvered = groups.some(g => list.every(c => g.customers.includes(c)));
        if (!fullyConvered) {
          groups.push({ reason: 'phone', label: `…${tail}`, customers: list });
        }
      }
    }

    // Same phone number recorded under more than one distinct name/notes identity over time
    // (e.g. once with the customer's actual name, again with a nickname written in notes).
    // Pre-computed via getPhoneNameConflicts() and refreshed alongside the customer list.
    for (const conflict of this.phoneNameConflicts) {
      const pseudoCustomers: CustomerSummary[] = conflict.identifiers.map(id => ({
        phone_number: conflict.phone_number,
        customer_name: id.identifier,
        visit_count: id.count,
        total_spent: 0,
        last_visit: '',
      }));
      groups.push({ reason: 'phone-name', label: conflict.phone_number, customers: pseudoCustomers });
    }

    return groups.filter(g => !this.dismissedGroups.has(g.label));
  }

  constructor(
    private api: DatabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    public branding: BrandingService,
  ) {
    addIcons({ peopleOutline, trashOutline, gitMergeOutline, warningOutline, personOutline, callOutline, refreshOutline, createOutline, closeCircleOutline, searchOutline });
  }

  ngOnInit(): void { }

  ionViewWillEnter(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.dismissedGroups.clear();
    forkJoin({
      customers: this.api.getAllCustomers(),
      orphans: this.api.getOrphanCustomers(),
    }).subscribe(({ customers, orphans }) => {
      this.customers = customers;
      this.orphanCustomers = orphans;
      this.loading = false;
    });
  }

  onRefresh(event: CustomEvent): void {
    forkJoin({
      customers: this.api.getAllCustomers(),
      orphans: this.api.getOrphanCustomers(),
    }).subscribe(({ customers, orphans }) => {
      this.customers = customers;
      this.orphanCustomers = orphans;
      (event.target as HTMLIonRefresherElement).complete();
    });
  }

  scanPhoneNameConflicts(): void {
    this.scanningPhoneConflicts = true;
    this.api.getPhoneNameConflicts().subscribe(conflicts => {
      this.phoneNameConflicts = conflicts;
      this.phoneConflictsScanned = true;
      this.scanningPhoneConflicts = false;
    });
  }

  dismissGroup(group: DuplicateGroup): void {
    this.dismissedGroups.add(group.label);
  }

  async editCustomer(c: CustomerSummary): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Edit Customer',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Name', value: c.customer_name },
        { name: 'phone', type: 'tel', placeholder: 'Phone number', value: c.phone_number },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            const newName = (data.name ?? '').trim();
            const newPhone = (data.phone ?? '').trim();
            if (!newPhone) {
              const err = await this.alertCtrl.create({ header: 'Required', message: 'Phone number cannot be empty.', buttons: ['OK'] });
              await err.present();
              return false;
            }
            this.api.updateCustomer(c.phone_number, newPhone, newName).subscribe(async () => {
              const idx = this.customers.findIndex(x => x.phone_number === c.phone_number);
              if (idx !== -1) {
                this.customers[idx] = { ...this.customers[idx], customer_name: newName, phone_number: newPhone };
              }
              const toast = await this.toastCtrl.create({ message: 'Customer updated.', duration: 2000, color: 'success' });
              await toast.present();
            });
            return true;
          },
        },
      ],
    });
    await alert.present();
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
      label: `${c.customer_name || '(no name)'} — ${c.phone_number || '(no phone)'} (${c.visit_count} visits)`,
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
            if (!target) return false;
            if (!target.phone_number) {
              const err = await this.alertCtrl.create({
                header: 'Phone Number Required',
                message: 'Please keep a record that has a phone number — merging into a walk-in (no phone) record would remove the phone number from the others.',
                buttons: ['OK'],
              });
              await err.present();
              return false;
            }

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

                    if (group.reason === 'phone-name') {
                      // All entries share the same phone number — just standardize every transaction
                      // for that phone onto the chosen name/identifier instead of merging phones.
                      await firstValueFrom(this.api.unifyPhoneIdentity(target.phone_number, target.customer_name));
                      this.scanPhoneNameConflicts();
                    } else {
                      const sources = group.customers.filter(c => c.phone_number !== target.phone_number);
                      for (const src of sources) {
                        await firstValueFrom(this.api.mergeCustomers(src.phone_number, target.phone_number, target.customer_name, src.customer_name));
                      }
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
            return true;
          },
        },
      ],
    });
    await alert.present();
  }
}
