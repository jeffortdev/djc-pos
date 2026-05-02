import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline, barChartOutline, receiptOutline, settingsOutline, analyticsOutline
} from 'ionicons/icons';
import { DatabaseService } from '../services/database.service';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="pos" href="/pos">
          <ion-icon name="cash-outline"></ion-icon>
          <ion-label>POS</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="dashboard" href="/dashboard">
          <ion-icon name="bar-chart-outline"></ion-icon>
          <ion-label>Dashboard</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="transactions" href="/transactions">
          <ion-icon name="receipt-outline"></ion-icon>
          <ion-label>History</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="reports" href="/reports">
          <ion-icon name="analytics-outline"></ion-icon>
          <ion-label>Reports</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="settings" (click)="openSettings($event)">
          <ion-icon name="settings-outline"></ion-icon>
          <ion-label>Settings</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsComponent {
  constructor(
    private api: DatabaseService,
    private router: Router,
  ) {
    addIcons({ cashOutline, barChartOutline, receiptOutline, settingsOutline, analyticsOutline });
  }

  openSettings(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.router.navigate(['/settings']);
  }
}
