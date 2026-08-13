import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonInput, IonTextarea, IonButton, IonIcon, IonNote, IonRange,
  IonSegment, IonSegmentButton,
  ToastController, AlertController
} from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import { lockClosedOutline, chevronForwardOutline, constructOutline, addCircleOutline, cloudDownloadOutline, cloudUploadOutline, textOutline, imageOutline, layersOutline, trashOutline, sunnyOutline, moonOutline, laptopOutline, peopleOutline, trendingUpOutline } from 'ionicons/icons';
import { DatabaseService } from '../../services/database.service';
import { BrandingService, ColorTheme } from '../../services/branding.service';
import { MessagingService } from '../../services/messaging.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonInput, IonTextarea, IonButton, IonIcon, IonNote, IonRange,
    IonSegment, IonSegmentButton,
  ],
  providers: [ToastController, AlertController],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage {
  currentPin = '';
  monthlyTarget = 0;
  targetSaving = false;
  newPin = '';
  confirmPin = '';
  errorMsg = '';
  saving = false;
  smsMessage = '';
  smsSaving = false;
  loyaltySmsMessage = '';
  loyaltySmsSaving = false;

  // Branding
  appTitle         = '';
  titleSaving      = false;
  logoPreview      = '';
  watermarkPreview = '';
  watermarkOpacityPct = 15;
  screenSizeHint   = '';
  colorTheme: ColorTheme = 'system';

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
    addIcons({ lockClosedOutline, chevronForwardOutline, constructOutline, addCircleOutline, cloudDownloadOutline, cloudUploadOutline, textOutline, imageOutline, layersOutline, trashOutline, sunnyOutline, moonOutline, laptopOutline, peopleOutline, trendingUpOutline });
    this.screenSizeHint = this.buildScreenHint();
  }

  async ngOnInit(): Promise<void> {
    this.monthlyTarget = parseFloat(await firstValueFrom(this.api.getSetting('monthly_target', '0'))) || 0;
    this.smsMessage = await firstValueFrom(this.api.getSetting(
      'sms_message',
      'Hi {{customer_name}}! Your order #{{order_id}} is ready for pickup. Thank you for choosing DJC POS!'
    ));
    this.loyaltySmsMessage = await firstValueFrom(this.api.getSetting(
      'loyalty_sms_message',
      'Hi {{customer_name}}! You have earned a loyalty reward! Visit us to claim your incentive. Thank you!'
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
    this.colorTheme = (this.branding.colorTheme$.value as ColorTheme);
  }

  async saveMonthlyTarget(): Promise<void> {
    this.targetSaving = true;
    await firstValueFrom(this.api.setSetting('monthly_target', (this.monthlyTarget ?? 0).toString()));
    this.targetSaving = false;
    const toast = await this.toastCtrl.create({ message: 'Monthly target saved', duration: 1500, color: 'success' });
    await toast.present();
  }

  // PIN verification is enforced by the destination pages themselves (Services, Products,
  // Customers all require the admin PIN on ionViewWillEnter), so navigation here is direct —
  // this also prevents having to enter the PIN twice.
  goServices(): void {
    this.router.navigate(['/services']);
  }

  goProducts(): void {
    this.router.navigate(['/products']);
  }

  goCustomers(): void {
    this.router.navigate(['/customers']);
  }

  clearError(): void {
    this.errorMsg = '';
  }

  // ── Branding methods ────────────────────────────────────────────────────────

  async saveTheme(): Promise<void> {
    await this.branding.saveColorTheme(this.colorTheme);
  }

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
    const message = this.smsMessage?.trim() || 'Hi {{customer_name}}! Your order #{{order_id}} is ready for pickup. Thank you for choosing DJC POS!';
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

  async saveLoyaltySmsMessage(): Promise<void> {
    this.loyaltySmsSaving = true;
    const message = this.loyaltySmsMessage?.trim() || 'Hi {{customer_name}}! You have earned a loyalty reward! Visit us to claim your incentive. Thank you!';
    this.api.setSetting('loyalty_sms_message', message).subscribe(async () => {
      this.loyaltySmsSaving = false;
      const toast = await this.toastCtrl.create({ message: 'Loyalty SMS template saved.', duration: 2500, color: 'success' });
      await toast.present();
    }, async () => {
      this.loyaltySmsSaving = false;
      const toast = await this.toastCtrl.create({ message: 'Unable to save loyalty SMS template.', duration: 2500, color: 'danger' });
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
