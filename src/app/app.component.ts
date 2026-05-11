import { Component } from '@angular/core';
import { AlertController } from '@ionic/angular';
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

  constructor(
    private api: DatabaseService,
    private alertCtrl: AlertController,
    public branding: BrandingService,
  ) {
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
}
