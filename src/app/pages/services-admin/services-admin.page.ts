import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
  IonIcon, IonSpinner, IonButton, IonButtons, IonItem, IonLabel, IonInput,
  IonSelect, IonSelectOption, IonToggle, IonRefresher,
  IonRefresherContent, AlertController, ToastController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, createOutline, trashOutline, checkmarkOutline, closeOutline } from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
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
    IonRefresherContent,
  ],
  providers: [AlertController, ToastController, ModalController],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>
          <img src="assets/logo.svg" alt="DJC POS" class="header-logo">
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="startAdd()">
            <ion-icon name="add-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refreshList($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (loading) {
        <div class="loading-center">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
      }

      <!-- Add / Edit form -->
      @if (editing) {
        <ion-card class="edit-card">
          <ion-card-content>
            <h2 class="form-heading">{{ isNew ? 'New Service' : 'Edit Service' }}</h2>
            <ion-item>
              <ion-label position="stacked">Name *</ion-label>
              <ion-input [(ngModel)]="form.name" placeholder="Service name"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Price *</ion-label>
              <ion-input type="number" min="0" step="0.01" [(ngModel)]="form.price" placeholder="0.00"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Category</ion-label>
              <ion-select [(ngModel)]="form.category" interface="action-sheet">
                @for (cat of categories; track cat) {
                  <ion-select-option [value]="cat">{{ cat }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Unit</ion-label>
              <ion-select [(ngModel)]="form.unit" interface="action-sheet">
                @for (u of units; track u) {
                  <ion-select-option [value]="u">{{ u }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
            <div class="form-actions">
              <ion-button fill="outline" (click)="cancelEdit()">
                <ion-icon name="close-outline" slot="start"></ion-icon>
                Cancel
              </ion-button>
              <ion-button [disabled]="!form.name || !form.price" (click)="save()">
                <ion-icon name="checkmark-outline" slot="start"></ion-icon>
                Save
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      }

      <!-- Service list -->
      <div class="service-list">
        @for (svc of services; track svc.id) {
          <ion-card class="svc-card">
            <ion-card-content>
              <div class="svc-row">
                <div class="svc-info">
                  <span class="svc-name">{{ svc.name }}</span>
                  <span class="svc-meta">{{ svc.category }} · {{ svc.unit }}</span>
                </div>
                <span class="svc-price">{{ svc.price | currency:'PHP':'symbol':'1.2-2' }}</span>
                <ion-toggle
                  [checked]="svc.active === 1"
                  (ionChange)="toggleActive(svc, $event.detail.checked)"
                  size="small"
                ></ion-toggle>
                <ion-button fill="clear" size="small" (click)="startEdit(svc)">
                  <ion-icon name="create-outline" slot="icon-only"></ion-icon>
                </ion-button>
                <ion-button fill="clear" size="small" color="danger" (click)="deleteService(svc)">
                  <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .loading-center { display: flex; justify-content: center; align-items: center; height: 60vh; }
    .edit-card { margin: 8px; }
    .form-heading { font-size: 1rem; font-weight: 600; margin: 0 0 8px; }
    .form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
    .service-list { padding: 8px; display: flex; flex-direction: column; gap: 6px; }
    .svc-card ion-card-content { padding: 10px 12px; }
    .svc-row { display: flex; align-items: center; gap: 6px; }
    .svc-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .svc-name { font-weight: 600; font-size: 0.9rem; }
    .svc-meta { font-size: 0.72rem; opacity: 0.55; text-transform: capitalize; }
    .svc-price { font-weight: 700; color: var(--ion-color-primary); white-space: nowrap; }
  `],
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

  constructor(
    private api: DatabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ addOutline, createOutline, trashOutline, checkmarkOutline, closeOutline });
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
    this.form = { name: '', price: 0, category: 'standard', unit: 'per item' };
  }

  startEdit(svc: LaundryService): void {
    this.isNew = false;
    this.editing = true;
    this.editId = svc.id;
    this.form = { ...svc };
  }

  cancelEdit(): void { this.editing = false; }

  save(): void {
    const onSaved = async () => {
      this.editing = false;
      this.loadServices();
      const msg = this.isNew ? 'Service added' : 'Service updated';
      const toast = await this.toastCtrl.create({ message: msg, duration: 2000 });
      await toast.present();
    };
    if (this.isNew) {
      this.api.createService(this.form).subscribe({ next: () => onSaved() });
    } else {
      this.api.updateService(this.editId, this.form).subscribe({ next: () => onSaved() });
    }
  }

  toggleActive(svc: LaundryService, active: boolean): void {
    this.api.updateService(svc.id, { ...svc, active: active ? 1 : 0 }).subscribe(() => {
      svc.active = active ? 1 : 0;
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
