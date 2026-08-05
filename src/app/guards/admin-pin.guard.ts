import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from '../services/database.service';

/**
 * Route guard that blocks navigation to admin-only pages (Reports, Services, Products,
 * Customers) until the correct admin PIN (the `register_pin` setting) is entered.
 *
 * Enforcing this at the route level (rather than each page prompting for a PIN after it has
 * already mounted via ionViewWillEnter) closes the gap where a page's content could briefly
 * render — or be reached at all — before its own lifecycle hook had a chance to re-lock it,
 * e.g. when Ionic keeps a tab's page instance alive/cached across tab switches. The guard runs
 * on every navigation attempt to a protected route, so the PIN must be re-entered every time.
 */
export const adminPinGuard: CanActivateFn = () => {
  const alertCtrl = inject(AlertController);
  const api = inject(DatabaseService);
  const router = inject(Router);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (!ok) router.navigateByUrl('/pos');
      resolve(ok);
    };

    (async () => {
      const alert = await alertCtrl.create({
        header: 'Admin PIN Required',
        message: 'Enter the admin PIN to continue.',
        backdropDismiss: false,
        inputs: [{ name: 'pin', type: 'password', placeholder: 'PIN' }],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => { finish(false); return true; },
          },
          {
            text: 'OK',
            handler: (data: { pin?: string }) => {
              return (async () => {
                const pin = data.pin?.toString() ?? '';
                const stored = await firstValueFrom(api.getSetting('register_pin', '1234'));
                if (pin !== stored) {
                  const err = await alertCtrl.create({
                    header: 'Incorrect PIN',
                    message: 'The PIN you entered is wrong.',
                    buttons: ['OK'],
                  });
                  await err.present();
                  return false; // keep the PIN alert open for another attempt
                }
                finish(true);
                return true;
              })();
            },
          },
        ],
      });
      await alert.present();
    })();
  });
};
