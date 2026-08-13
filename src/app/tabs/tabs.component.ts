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
  templateUrl: './tabs.component.html',
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
