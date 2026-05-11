import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { DatabaseService } from './database.service';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  readonly appTitle$        = new BehaviorSubject<string>('DJC Point of Sale');
  readonly logoSrc$         = new BehaviorSubject<string>('assets/logo.svg');
  readonly watermarkSrc$    = new BehaviorSubject<string>('');
  readonly watermarkOpacity$ = new BehaviorSubject<number>(0.15);

  constructor(private db: DatabaseService) {
    this.load();
  }

  private async load(): Promise<void> {
    const [title, logo, watermark, opacity] = await Promise.all([
      firstValueFrom(this.db.getSetting('app_title', '')),
      firstValueFrom(this.db.getSetting('app_logo', '')),
      firstValueFrom(this.db.getSetting('app_watermark', '')),
      firstValueFrom(this.db.getSetting('app_watermark_opacity', '0.15')),
    ]);
    if (title) this.appTitle$.next(title);
    this.logoSrc$.next(logo || 'assets/logo.svg');
    this.watermarkSrc$.next(watermark);
    this.watermarkOpacity$.next(parseFloat(opacity) || 0.15);
  }

  async saveTitle(title: string): Promise<void> {
    const trimmed = title.trim();
    await firstValueFrom(this.db.setSetting('app_title', trimmed));
    this.appTitle$.next(trimmed || 'DJC Point of Sale');
  }

  async saveLogo(dataUrl: string): Promise<void> {
    await firstValueFrom(this.db.setSetting('app_logo', dataUrl));
    this.logoSrc$.next(dataUrl || 'assets/logo.svg');
  }

  async saveWatermark(dataUrl: string): Promise<void> {
    await firstValueFrom(this.db.setSetting('app_watermark', dataUrl));
    this.watermarkSrc$.next(dataUrl);
  }

  async saveWatermarkOpacity(opacity: number): Promise<void> {
    await firstValueFrom(this.db.setSetting('app_watermark_opacity', opacity.toString()));
    this.watermarkOpacity$.next(opacity);
  }
}
