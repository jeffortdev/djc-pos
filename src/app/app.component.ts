import { Component } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { DatabaseService } from './services/database.service';
import { BrandingService } from './services/branding.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  watermarkSrc    = '';
  watermarkOpacity = 0.15;
  isInitializing = true;
  initError: string | null = null;
  logoSrc = '';
  private initTimeoutId: any = null;

  constructor(
    private api: DatabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    public branding: BrandingService,
  ) {
    // Load cached logo from localStorage for the loading screen
    this.logoSrc = localStorage.getItem('app_logo_cache') || 'assets/logo.svg';

    // Set a 15-second timeout for initialization (handles WebView/SQLite hangs)
    this.initTimeoutId = setTimeout(() => {
      if (this.isInitializing) {
        console.error('CRITICAL: Database initialization timeout after 15s. Possible WebView/SQLite hang.');
        this.handleInitTimeout();
      }
    }, 15000);

    // Monitor database initialization state
    this.api.isInitializing$.subscribe(state => {
      this.isInitializing = state;
      if (!state) {
        clearTimeout(this.initTimeoutId);
      }
    });

    // Monitor for initialization errors
    this.api.initError$.subscribe(async error => {
      if (error) {
        this.initError = error;
        console.error('Database init error:', error);
        clearTimeout(this.initTimeoutId);
        const toast = await this.toastCtrl.create({
          message: `Database initialization failed: ${error}`,
          duration: 0,
          position: 'bottom',
          color: 'danger',
          buttons: [{ text: 'Dismiss', role: 'cancel' }],
        });
        await toast.present();
      }
    });

    // Log initialization progress
    console.log('AppComponent initialized - starting database init...');

    // Monitor for database recovery messages
    this.api.recovery$.subscribe(async msg => {
      if (!msg) {
        return;
      }
      const alert = await this.alertCtrl.create({
        header: 'Database Recovery',
        message: msg,
        buttons: ['OK'],
      });
      await alert.present();
    });

    this.branding.watermarkSrc$.subscribe(src => (this.watermarkSrc = src));
    this.branding.watermarkOpacity$.subscribe(op => (this.watermarkOpacity = op));
  }

  private async handleInitTimeout() {
    this.isInitializing = false;
    this.initError = 'Initialization timeout. Device may have WebView compatibility issues. Try restarting the app.';
    console.error('TIMEOUT HANDLER:', this.initError);
    const toast = await this.toastCtrl.create({
      message: this.initError,
      duration: 0,
      position: 'bottom',
      color: 'danger',
      buttons: [
        { 
          text: 'Retry', 
          role: 'cancel',
          handler: () => location.reload()
        },
        { 
          text: 'Exit', 
          role: 'destructive'
        }
      ],
    });
    await toast.present();
  }
}
