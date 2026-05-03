import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
  IonIcon, IonSpinner, IonButton, IonButtons, IonItem, IonLabel, IonInput,
  IonSelect, IonSelectOption, IonToggle, IonRefresher, IonRefresherContent,
  AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, createOutline, trashOutline, checkmarkOutline, closeOutline } from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
import { Product } from '../../models/models';

const PRODUCT_TYPES = ['Dry Goods', 'Cleaning Supplies', 'Detergent', 'Accessories', 'Other'];

@Component({
  selector: 'app-products-admin',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
    IonIcon, IonSpinner, IonButton, IonButtons, IonItem, IonLabel, IonInput,
    IonSelect, IonSelectOption, IonToggle, IonRefresher, IonRefresherContent,
  ],
  providers: [AlertController, ToastController],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>
          <img src="assets/logo.svg" alt="DJC Point of Sale" class="header-logo">
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="startAdd()">
            <ion-icon name="add-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
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
      }

      @if (editing) {
        <ion-card class="edit-card">
          <ion-card-content>
            <h2 class="form-heading">{{ isNew ? 'New Product' : 'Edit Product' }}</h2>
            <ion-item>
              <ion-label position="stacked">Name *</ion-label>
              <ion-input [(ngModel)]="form.name" placeholder="Product name"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Type</ion-label>
              <ion-select [(ngModel)]="form.type" interface="action-sheet">
                @for (type of types; track type) {
                  <ion-select-option [value]="type">{{ type }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Cost *</ion-label>
              <ion-input type="number" min="0" step="0.01" [(ngModel)]="form.cost" placeholder="0.00"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Price *</ion-label>
              <ion-input type="number" min="0" step="0.01" [(ngModel)]="form.price" placeholder="0.00"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Current Stock *</ion-label>
              <ion-input type="number" min="0" step="1" [(ngModel)]="form.stock" placeholder="0"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label>Active</ion-label>
              <ion-toggle [(ngModel)]="form.active"></ion-toggle>
            </ion-item>
            <div class="form-actions">
              <ion-button fill="outline" (click)="cancelEdit()">
                <ion-icon name="close-outline" slot="start"></ion-icon>
                Cancel
              </ion-button>
              <ion-button [disabled]="!form.name || form.price === undefined || form.cost === undefined || form.stock === undefined" (click)="save()">
                <ion-icon name="checkmark-outline" slot="start"></ion-icon>
                Save
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      }

      <div class="product-list">
        @for (product of products; track product.id) {
          <ion-card class="prod-card">
            <ion-card-content>
              <div class="prod-row">
                <div class="prod-info">
                  <span class="prod-name">{{ product.name }}</span>
                  <span class="prod-meta">{{ product.type }} · Stock: {{ product.stock }}</span>
                </div>
                <span class="prod-price">{{ product.price | currency:'PHP':'symbol':'1.2-2' }}</span>
              </div>
              <div class="prod-actions">
                <ion-button fill="clear" size="small" (click)="startEdit(product)">
                  <ion-icon name="create-outline" slot="icon-only"></ion-icon>
                </ion-button>
                <ion-button fill="clear" size="small" color="danger" (click)="deleteProduct(product)">
                  <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `.loading-center { display: flex; justify-content: center; align-items: center; height: 60vh; }`,
    `.edit-card { margin: 8px; }`,
    `.form-heading { font-size: 1rem; font-weight: 600; margin: 0 0 8px; }`,
    `.form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }`,
    `.product-list { padding: 8px; display: flex; flex-direction: column; gap: 8px; }`,
    `.prod-card ion-card-content { padding: 10px 12px; }`,
    `.prod-row { display: flex; align-items: center; gap: 8px; }`,
    `.prod-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }`,
    `.prod-name { font-weight: 600; font-size: 0.92rem; }`,
    `.prod-meta { font-size: 0.74rem; opacity: 0.55; }`,
    `.prod-price { font-weight: 700; color: var(--ion-color-primary); white-space: nowrap; }`,
    `.prod-actions { display: flex; justify-content: flex-end; margin-top: 8px; gap: 4px; }`,
  ],
})
export class ProductsAdminPage implements OnInit {
  products: Product[] = [];
  loading = true;
  editing = false;
  isNew = false;
  types = PRODUCT_TYPES;
  form: Partial<Product> = {};
  private editId = 0;

  constructor(
    private api: DatabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ addOutline, createOutline, trashOutline, checkmarkOutline, closeOutline });
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.api.getAllProducts().subscribe(products => {
      this.products = products;
      this.loading = false;
    });
  }

  refresh(event: CustomEvent): void {
    this.api.getAllProducts().subscribe(products => {
      this.products = products;
      (event.target as HTMLIonRefresherElement).complete();
    });
  }

  startAdd(): void {
    this.isNew = true;
    this.editing = true;
    this.editId = 0;
    this.form = { name: '', type: this.types[0], cost: 0, price: 0, stock: 0, active: 1 };
  }

  startEdit(product: Product): void {
    this.isNew = false;
    this.editing = true;
    this.editId = product.id;
    this.form = { ...product };
  }

  cancelEdit(): void {
    this.editing = false;
  }

  save(): void {
    const saveAndFinish = async () => {
      this.editing = false;
      this.loadProducts();
      const toast = await this.toastCtrl.create({ message: this.isNew ? 'Product added' : 'Product updated', duration: 2000 });
      await toast.present();
    };

    if (this.isNew) {
      this.api.createProduct(this.form).subscribe({ next: saveAndFinish });
    } else {
      this.api.updateProduct(this.editId, this.form).subscribe({ next: saveAndFinish });
    }
  }

  async deleteProduct(product: Product): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete Product',
      message: `Delete "${product.name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: () => {
            this.api.deleteProduct(product.id).subscribe(async () => {
              this.products = this.products.filter(p => p.id !== product.id);
              const toast = await this.toastCtrl.create({ message: 'Product deleted', duration: 2000 });
              await toast.present();
            });
          }
        }
      ]
    });
    await alert.present();
  }
}
