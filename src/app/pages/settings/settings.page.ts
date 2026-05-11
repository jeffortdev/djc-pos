import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonInput, IonTextarea, IonButton, IonIcon, IonNote, IonRange,
  ToastController, AlertController
} from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import { lockClosedOutline, chevronForwardOutline, constructOutline, addCircleOutline, cloudDownloadOutline, cloudUploadOutline, textOutline, imageOutline, layersOutline, trashOutline } from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
import { BrandingService } from '../../services/branding.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonInput, IonTextarea, IonButton, IonIcon, IonNote, IonRange,
  ],
  providers: [ToastController, AlertController],
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
      </ion-toolbar>
    </ion-header>

    <ion-content>

      <!-- Branding -->
      <div class="section-header">Branding</div>

      <!-- App Title -->
      <ion-list inset>
        <ion-item>
          <ion-icon name="text-outline" slot="start" color="primary"></ion-icon>
          <ion-label position="stacked">Header Title</ion-label>
          <ion-input
            placeholder="DJC Point of Sale"
            [(ngModel)]="appTitle"
          ></ion-input>
        </ion-item>
      </ion-list>
      <div class="btn-wrap">
        <ion-button expand="block" fill="outline" (click)="saveTitle()" [disabled]="titleSaving">
          <ion-icon name="text-outline" slot="start"></ion-icon>
          Save Title
        </ion-button>
      </div>

      <!-- Logo Upload -->
      <ion-list inset>
        <ion-item>
          <ion-icon name="image-outline" slot="start" color="primary"></ion-icon>
          <ion-label>
            <h3>Header Logo</h3>
            <p>Replaces the logo on all page headers</p>
          </ion-label>
        </ion-item>
        @if (logoPreview) {
          <ion-item lines="none" class="preview-item">
            <img [src]="logoPreview" class="preview-img">
          </ion-item>
        }
        <ion-item lines="none" class="action-row">
          <ion-button fill="outline" size="small" (click)="pickLogo()">
            <ion-icon name="cloud-upload-outline" slot="start"></ion-icon>
            Upload Logo
          </ion-button>
          @if (logoPreview && logoPreview !== 'assets/logo.svg') {
            <ion-button fill="outline" size="small" color="danger" (click)="removeLogo()" class="ml-8">
              <ion-icon name="trash-outline" slot="start"></ion-icon>
              Remove
            </ion-button>
          }
        </ion-item>
      </ion-list>

      <!-- Watermark / Background -->
      <div class="section-header">Background / Watermark</div>
      <ion-list inset>
        <ion-item>
          <ion-icon name="layers-outline" slot="start" color="primary"></ion-icon>
          <ion-label>
            <h3>Watermark Image</h3>
            <p>Full-screen overlay behind the app (non-interactive)</p>
            <p class="screen-hint">Recommended size for this device: <strong>{{ screenSizeHint }}</strong></p>
          </ion-label>
        </ion-item>
        @if (watermarkPreview) {
          <ion-item lines="none" class="preview-item">
            <img [src]="watermarkPreview" class="preview-img watermark-thumb">
          </ion-item>
        }
        <ion-item lines="none" class="action-row">
          <ion-button fill="outline" size="small" (click)="pickWatermark()">
            <ion-icon name="cloud-upload-outline" slot="start"></ion-icon>
            Upload Watermark
          </ion-button>
          @if (watermarkPreview) {
            <ion-button fill="outline" size="small" color="danger" (click)="removeWatermark()" class="ml-8">
              <ion-icon name="trash-outline" slot="start"></ion-icon>
              Remove
            </ion-button>
          }
        </ion-item>
        @if (watermarkPreview) {
          <ion-item>
            <ion-icon name="layers-outline" slot="start" color="medium"></ion-icon>
            <ion-label>Opacity</ion-label>
            <div class="opacity-wrap" slot="end">
              <ion-range
                min="5"
                max="80"
                step="1"
                [value]="watermarkOpacityPct"
                (ionChange)="onOpacityChange($event)"
                style="min-width: 160px;"
              ></ion-range>
              <span class="opacity-pct">{{ watermarkOpacityPct }}%</span>
            </div>
          </ion-item>
        }
      </ion-list>

      <!-- Services admin link -->
      <div class="section-header">Services</div>
      <ion-list inset>
        <ion-item button (click)="goServices()" detail>
          <ion-icon name="construct-outline" slot="start" color="primary"></ion-icon>
          <ion-label>Manage Services</ion-label>
        </ion-item>
      </ion-list>

      <!-- Products admin link -->
      <div class="section-header">Products</div>
      <ion-list inset>
        <ion-item button (click)="goProducts()" detail>
          <ion-icon name="add-circle-outline" slot="start" color="primary"></ion-icon>
          <ion-label>Manage Products</ion-label>
        </ion-item>
      </ion-list>

      <!-- Change PIN -->
      <div class="section-header">Security</div>
      <ion-list inset>
        <ion-item>
          <ion-icon name="lock-closed-outline" slot="start" color="primary"></ion-icon>
          <ion-label position="stacked">Current PIN</ion-label>
          <ion-input
            type="password"
            inputmode="numeric"
            maxlength="20"
            placeholder="Enter current PIN"
            [(ngModel)]="currentPin"
            (ionInput)="clearError()"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-label position="stacked">New PIN</ion-label>
          <ion-input
            type="password"
            inputmode="numeric"
            maxlength="20"
            placeholder="Enter new PIN"
            [(ngModel)]="newPin"
            (ionInput)="clearError()"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Confirm New PIN</ion-label>
          <ion-input
            type="password"
            inputmode="numeric"
            maxlength="20"
            placeholder="Repeat new PIN"
            [(ngModel)]="confirmPin"
            (ionInput)="clearError()"
          ></ion-input>
        </ion-item>
        @if (errorMsg) {
          <ion-item lines="none">
            <ion-note color="danger" class="err-note">{{ errorMsg }}</ion-note>
          </ion-item>
        }
      </ion-list>

      <div class="btn-wrap">
        <ion-button expand="block" (click)="changePin()" [disabled]="saving">
          <ion-icon name="lock-closed-outline" slot="start"></ion-icon>
          Change PIN
        </ion-button>
      </div>

      <div class="section-header">SMS Message</div>
      <ion-list inset>
        <ion-item>
          <ion-label position="stacked">Pickup notification template</ion-label>
          <ion-textarea
            rows="5"
            placeholder="Enter SMS message template"
            [(ngModel)]="smsMessage"
          ></ion-textarea>
        </ion-item>
        <ion-item lines="none">
          <ion-note>
            Use <strong>{{ '{{order_id}}' }}</strong> for the order number.
          </ion-note>
        </ion-item>
      </ion-list>
      <div class="btn-wrap">
        <ion-button expand="block" fill="outline" (click)="saveSmsMessage()" [disabled]="smsSaving">
          <ion-icon name="chatbubble-outline" slot="start"></ion-icon>
          Save SMS Template
        </ion-button>
      </div>

      <div class="section-header">Backup</div>
      <ion-list inset>
        <ion-item lines="none">
          <ion-button expand="block" fill="outline" (click)="backupDatabase()">
            <ion-icon name="cloud-download-outline" slot="start"></ion-icon>
            Backup Database
          </ion-button>
        </ion-item>
        <ion-item lines="none">
          <ion-button expand="block" fill="outline" (click)="restoreDatabase()">
            <ion-icon name="cloud-upload-outline" slot="start"></ion-icon>
            Restore Database
          </ion-button>
        </ion-item>
      </ion-list>

    </ion-content>
  `,
  styles: [`
    .section-header {
      padding: 18px 20px 4px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      opacity: 0.5;
    }
    .btn-wrap { padding: 12px 16px; }
    .err-note { font-size: 0.82rem; padding: 4px 0; }
    .preview-item { --padding-start: 16px; }
    .preview-img {
      max-height: 80px;
      max-width: 100%;
      object-fit: contain;
      border-radius: 8px;
      margin: 8px 0;
    }
    .watermark-thumb { max-height: 100px; }
    .action-row { --padding-start: 16px; padding: 6px 0; }
    .ml-8 { margin-left: 8px; }
    .opacity-wrap { display: flex; align-items: center; gap: 8px; }
    .opacity-pct { font-size: 0.82rem; min-width: 36px; text-align: right; opacity: 0.7; }
    .screen-hint { font-size: 0.75rem; opacity: 0.6; margin-top: 2px; }
    .screen-hint strong { opacity: 0.9; }
  `],
})
export class SettingsPage {
  currentPin = '';
  newPin = '';
  confirmPin = '';
  errorMsg = '';
  saving = false;
  smsMessage = '';
  smsSaving = false;

  // Branding
  appTitle         = '';
  titleSaving      = false;
  logoPreview      = '';
  watermarkPreview = '';
  watermarkOpacityPct = 15;
  screenSizeHint   = '';

  private buildScreenHint(): string {
    const w = window.screen.width  * (window.devicePixelRatio || 1);
    const h = window.screen.height * (window.devicePixelRatio || 1);
    const pw = Math.round(w);
    const ph = Math.round(h);
    return `${pw} × ${ph} px`;
  }

  constructor(
    private api: DatabaseService,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    public branding: BrandingService,
  ) {
    addIcons({ lockClosedOutline, chevronForwardOutline, constructOutline, addCircleOutline, cloudDownloadOutline, cloudUploadOutline, textOutline, imageOutline, layersOutline, trashOutline });
    this.screenSizeHint = this.buildScreenHint();
  }

  async ngOnInit(): Promise<void> {
    this.smsMessage = await firstValueFrom(this.api.getSetting(
      'sms_message',
      'Hi! Your order #{{order_id}} is ready for pickup. Thank you for choosing DJC POS!'
    ));
    // Load branding state into local form fields
    const [title, logo, watermark, opacityStr] = await Promise.all([
      firstValueFrom(this.api.getSetting('app_title', '')),
      firstValueFrom(this.api.getSetting('app_logo', '')),
      firstValueFrom(this.api.getSetting('app_watermark', '')),
      firstValueFrom(this.api.getSetting('app_watermark_opacity', '0.15')),
    ]);
    this.appTitle          = title;
    this.logoPreview       = logo || 'assets/logo.svg';
    this.watermarkPreview  = watermark;
    this.watermarkOpacityPct = Math.round((parseFloat(opacityStr) || 0.15) * 100);
  }

  async requestPin(): Promise<boolean> {
    let granted = false;
    const alert = await this.alertCtrl.create({
      header: 'Enter PIN',
      inputs: [{ name: 'pin', type: 'password', placeholder: 'PIN' }],
      backdropDismiss: false,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            granted = false;
            return true;
          },
        },
        {
          text: 'OK',
          handler: async (data) => {
            const pin = data.pin?.toString().trim() ?? '';
            if (!pin) {
              const toast = await this.toastCtrl.create({
                message: 'PIN is required.',
                duration: 2000,
                color: 'warning',
              });
              await toast.present();
              return false;
            }

            const stored = await firstValueFrom(this.api.getSetting('register_pin', '1234'));
            if (pin !== stored) {
              const errorAlert = await this.alertCtrl.create({
                header: 'Incorrect PIN',
                message: 'The PIN you entered is wrong.',
                buttons: ['OK'],
              });
              await errorAlert.present();
              return false;
            }

            granted = true;
            return true;
          },
        },
      ],
    });

    await alert.present();
    await alert.onDidDismiss();
    return granted;
  }

  async goServices(): Promise<void> {
    if (await this.requestPin()) {
      this.router.navigate(['/services']);
    }
  }

  async goProducts(): Promise<void> {
    if (await this.requestPin()) {
      this.router.navigate(['/products']);
    }
  }

  clearError(): void {
    this.errorMsg = '';
  }

  // ── Branding methods ────────────────────────────────────────────────────────

  async saveTitle(): Promise<void> {
    this.titleSaving = true;
    await this.branding.saveTitle(this.appTitle);
    this.titleSaving = false;
    const toast = await this.toastCtrl.create({ message: 'Title saved.', duration: 2000, color: 'success' });
    await toast.present();
  }

  pickLogo(): void {
    this.pickImage(async (dataUrl) => {
      await this.branding.saveLogo(dataUrl);
      this.logoPreview = dataUrl;
      const toast = await this.toastCtrl.create({ message: 'Logo updated.', duration: 2000, color: 'success' });
      await toast.present();
    });
  }

  async removeLogo(): Promise<void> {
    await this.branding.saveLogo('');
    this.logoPreview = 'assets/logo.svg';
    const toast = await this.toastCtrl.create({ message: 'Logo removed.', duration: 2000, color: 'success' });
    await toast.present();
  }

  pickWatermark(): void {
    this.pickImage(async (dataUrl) => {
      await this.branding.saveWatermark(dataUrl);
      this.watermarkPreview = dataUrl;
      const toast = await this.toastCtrl.create({ message: 'Watermark updated.', duration: 2000, color: 'success' });
      await toast.present();
    });
  }

  async removeWatermark(): Promise<void> {
    await this.branding.saveWatermark('');
    this.watermarkPreview = '';
    const toast = await this.toastCtrl.create({ message: 'Watermark removed.', duration: 2000, color: 'success' });
    await toast.present();
  }

  onOpacityChange(event: Event): void {
    const pct = (event as CustomEvent).detail.value as number;
    this.watermarkOpacityPct = pct;
    this.branding.saveWatermarkOpacity(pct / 100);
  }

  private pickImage(onPick: (dataUrl: string) => Promise<void>): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif';
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        const toast = await this.toastCtrl.create({ message: 'Image must be smaller than 5 MB.', duration: 3000, color: 'warning' });
        await toast.present();
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        await onPick(reader.result as string);
      };
      reader.readAsDataURL(file);
    };
    document.body.appendChild(input);
    input.click();
  }

  async backupDatabase(): Promise<void> {
    try {
      const backup = await firstValueFrom(this.api.getBackupData());
      const fileName = `DJC_POS_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      const jsonStr = JSON.stringify(backup, null, 2);

      if (Capacitor.isNativePlatform()) {
        // Native Android/iOS: write to cache dir, then open OS share/save sheet
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        // encodeURIComponent + unescape handles multi-byte chars safely for btoa
        const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
        await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
        const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
        await Share.share({ title: 'DJC POS Backup', files: [uri] });
        const toast = await this.toastCtrl.create({
          message: 'Backup ready — choose where to save it.',
          duration: 2000,
          color: 'success',
        });
        await toast.present();
      } else {
        // Web browser — File System Access API (Chrome/Edge), then anchor-click fallback
        const blob = new Blob([jsonStr], { type: 'application/json' });
        if ((window as any).showSaveFilePicker) {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: 'DJC POS Backup', accept: { 'application/json': ['.json'] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } else {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = fileName;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          URL.revokeObjectURL(url);
        }
        const toast = await this.toastCtrl.create({
          message: 'Database backup saved successfully.',
          duration: 2500,
          color: 'success',
        });
        await toast.present();
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return; // User dismissed share sheet — not an error
      const toast = await this.toastCtrl.create({
        message: 'Unable to save database backup.',
        duration: 2500,
        color: 'danger',
      });
      await toast.present();
    }
  }

  async restoreDatabase(): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: 'Restore Database',
      message: 'This will replace your current database with the selected backup file. Continue?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Restore', handler: () => this.openBackupFile() },
      ],
    });
    await confirm.present();
  }

  private async openBackupFile(): Promise<void> {
    try {
      let file: File | null = null;

      if ((window as any).showOpenFilePicker) {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'DJC POS Backup', accept: { 'application/json': ['.json'] } }],
          multiple: false,
        });
        file = await handle.getFile();
      } else {
        file = await this.createHiddenFileInput();
      }

      if (!file) {
        return;
      }

      const text = await file.text();
      const backup = JSON.parse(text) as any;
      await firstValueFrom(this.api.restoreBackup(backup));

      const toast = await this.toastCtrl.create({
        message: 'Database restored successfully.',
        duration: 2500,
        color: 'success',
      });
      await toast.present();
    } catch (error) {
      const toast = await this.toastCtrl.create({
        message: 'Unable to restore backup. Please check the file and try again.',
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    }
  }

  private createHiddenFileInput(): Promise<File | null> {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.style.display = 'none';
      input.onchange = () => {
        const file = input.files?.[0] ?? null;
        document.body.removeChild(input);
        resolve(file);
      };
      document.body.appendChild(input);
      input.click();
    });
  }

  async saveSmsMessage(): Promise<void> {
    this.smsSaving = true;
    const message = this.smsMessage?.trim() || 'Hi! Your order #{{order_id}} is ready for pickup. Thank you for choosing DJC POS!';
    this.api.setSetting('sms_message', message).subscribe(async () => {
      this.smsSaving = false;
      const toast = await this.toastCtrl.create({ message: 'SMS template saved.', duration: 2500, color: 'success' });
      await toast.present();
    }, async () => {
      this.smsSaving = false;
      const toast = await this.toastCtrl.create({ message: 'Unable to save SMS template.', duration: 2500, color: 'danger' });
      await toast.present();
    });
  }

  changePin(): void {
    const cur = this.currentPin.trim();
    const next = this.newPin.trim();
    const conf = this.confirmPin.trim();

    if (!next || !conf) {
      this.errorMsg = 'All fields are required.';
      return;
    }
    if (next !== conf) {
      this.errorMsg = 'New PIN and confirmation do not match.';
      return;
    }
    if (next.length < 4) {
      this.errorMsg = 'PIN must be at least 4 characters.';
      return;
    }

    this.saving = true;
    this.api.getSetting('register_pin', '1234').subscribe(async stored => {
      if (cur !== stored) {
        this.errorMsg = 'Current PIN is incorrect.';
        this.saving = false;
        return;
      }
      this.api.setSetting('register_pin', next).subscribe(async () => {
        this.saving = false;
        this.currentPin = '';
        this.newPin = '';
        this.confirmPin = '';
        const toast = await this.toastCtrl.create({
          message: 'PIN changed successfully.',
          duration: 2500,
          color: 'success',
        });
        await toast.present();
      });
    });
  }
}
