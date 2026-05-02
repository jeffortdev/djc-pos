import { Component } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { DatabaseService } from './services/database.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private api: DatabaseService, private alertCtrl: AlertController) {
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
  }
}
