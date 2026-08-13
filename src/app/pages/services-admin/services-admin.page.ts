import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
  IonIcon, IonSpinner, IonButton, IonButtons, IonItem, IonLabel, IonInput,
  IonSelect, IonSelectOption, IonToggle, IonRefresher,
  IonRefresherContent, IonSearchbar, AlertController, ToastController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, createOutline, trashOutline, checkmarkOutline, closeOutline, heartOutline, heart, swapVerticalOutline } from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
import { BrandingService } from '../../services/branding.service';
import { LaundryService } from '../../models/models';

const CATEGORIES = ['wash', 'dry', 'press', 'dry-clean', 'special', 'standard'];
const UNITS = ['per kg', 'per load', 'per item', 'per piece', 'per pair', 'per set'];

@Component({
  selector: 'app-services-admin',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
    IonIcon, IonSpinner, IonButton, IonButtons, IonItem, IonLabel, IonInput,
    IonSelect, IonSelectOption, IonToggle, IonRefresher,
    IonRefresherContent, IonSearchbar,
  ],
  providers: [AlertController, ToastController, ModalController],
  templateUrl: './services-admin.page.html',
  styleUrls: ['./services-admin.page.scss'],
})
export class ServicesAdminPage implements OnInit {
  services: LaundryService[] = [];
  loading = true;
  editing = false;
  isNew = false;
  categories = CATEGORIES;
  units = UNITS;
  form: Partial<LaundryService> = {};
  private editId = 0;
  filterTerm = '';
  sortAsc = true;

  get filteredServices(): LaundryService[] {
    const term = this.filterTerm.toLowerCase().trim();
    let list = term ? this.services.filter(s => s.name.toLowerCase().includes(term)) : [...this.services];
    list.sort((a, b) => this.sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    return list;
  }

  constructor(
    private api: DatabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    public branding: BrandingService,
  ) {
    addIcons({ addOutline, createOutline, trashOutline, checkmarkOutline, closeOutline, heartOutline, heart, swapVerticalOutline });
  }

  ngOnInit(): void { this.loadServices(); }

  loadServices(): void {
    this.api.getAllServices().subscribe(s => { this.services = s; this.loading = false; });
  }

  refreshList(event: CustomEvent): void {
    this.api.getAllServices().subscribe(s => {
      this.services = s;
      (event.target as HTMLIonRefresherElement).complete();
    });
  }

  startAdd(): void {
    this.isNew = true;
    this.editing = true;
    this.form = { name: '', price: 0, category: 'standard', unit: 'per item', loyalty_tracking: 1 };
  }

  startEdit(svc: LaundryService): void {
    this.isNew = false;
    this.editing = true;
    this.editId = svc.id;
    this.form = { ...svc };
  }

  cancelEdit(): void { this.editing = false; }

  save(): void {
    if (this.isNew) {
      this.api.createService(this.form).subscribe({
        next: async (res) => {
          const newItem: LaundryService = {
            id: res.id,
            name: this.form.name!,
            price: this.form.price ?? 0,
            category: this.form.category ?? 'standard',
            unit: this.form.unit ?? 'per item',
            active: 1,
            sort_order: this.form.sort_order ?? 0,
            loyalty_tracking: this.form.loyalty_tracking ?? 1,
          };
          this.services.push(newItem);
          this.editing = false;
          const toast = await this.toastCtrl.create({ message: 'Service added', duration: 2000 });
          await toast.present();
        }
      });
    } else {
      this.api.updateService(this.editId, this.form).subscribe({
        next: async () => {
          const idx = this.services.findIndex(s => s.id === this.editId);
          if (idx !== -1) Object.assign(this.services[idx], this.form);
          this.editing = false;
          const toast = await this.toastCtrl.create({ message: 'Service updated', duration: 2000 });
          await toast.present();
        }
      });
    }
  }

  toggleActive(svc: LaundryService, active: boolean): void {
    this.api.updateService(svc.id, { ...svc, active: active ? 1 : 0 }).subscribe(() => {
      svc.active = active ? 1 : 0;
    });
  }

  toggleLoyalty(svc: LaundryService, val: boolean): void {
    this.api.updateService(svc.id, { ...svc, loyalty_tracking: val ? 1 : 0 }).subscribe(() => {
      svc.loyalty_tracking = val ? 1 : 0;
    });
  }

  async deleteService(svc: LaundryService): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete Service',
      message: `Delete "${svc.name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: () => {
            this.api.deleteService(svc.id).subscribe(async () => {
              this.services = this.services.filter(s => s.id !== svc.id);
              const toast = await this.toastCtrl.create({ message: 'Service deleted', duration: 2000 });
              await toast.present();
            });
          }
        }
      ],
    });
    await alert.present();
  }
}
