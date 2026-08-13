import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Platform } from '@ionic/angular/standalone';
import { DatabaseService } from './database.service';

// The service runs its localStorage-backed code path whenever Platform.is('capacitor')
// is false, which is exactly what we want to exercise in Karma (no native SQLite plugin
// available in a browser test run).
class FakePlatform {
  ready(): Promise<string> { return Promise.resolve('dom'); }
  is(): boolean { return false; }
}

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        DatabaseService,
        { provide: Platform, useValue: new FakePlatform() },
      ],
    });
    service = TestBed.inject(DatabaseService);
    await firstValueFrom(service.getSetting('__warmup__')); // waits for init to complete
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('settings', () => {
    it('round-trips a setting value', async () => {
      await firstValueFrom(service.setSetting('monthly_target', '50000'));
      const value = await firstValueFrom(service.getSetting('monthly_target', '0'));
      expect(value).toBe('50000');
    });

    it('returns the default when a setting is unset', async () => {
      const value = await firstValueFrom(service.getSetting('does_not_exist', 'fallback'));
      expect(value).toBe('fallback');
    });
  });

  describe('createTransaction', () => {
    it('computes subtotal/total from items and stores the transaction', async () => {
      const tx = await firstValueFrom(service.createTransaction({
        items: [
          { service_id: 1, service_name: 'Wash & Fold', unit: 'per kg', price: 65, quantity: 2, item_type: 'service' },
        ],
        payment_method: 'cash',
        amount_tendered: 200,
        customer_name: 'Jane Doe',
        phone_number: '09171234567',
      }));

      expect(tx.subtotal).toBe(130);
      expect(tx.total).toBe(130);
      expect(tx.change_due).toBe(70);
      expect(tx.status).toBe('paid');
      expect(tx.items?.length).toBe(1);
    });

    it('defaults status to paid when not provided', async () => {
      const tx = await firstValueFrom(service.createTransaction({
        items: [{ service_id: 1, service_name: 'Dry Only', unit: 'per load', price: 110, quantity: 1, item_type: 'service' }],
        payment_method: 'cash',
        amount_tendered: 110,
      }));
      expect(tx.status).toBe('paid');
    });
  });

  describe('getDashboardToday', () => {
    it('reflects revenue and transaction count for a paid transaction created today', async () => {
      await firstValueFrom(service.createTransaction({
        items: [{ service_id: 1, service_name: 'Wash & Fold', unit: 'per kg', price: 65, quantity: 1, item_type: 'service' }],
        payment_method: 'cash',
        amount_tendered: 65,
      }));

      const stats = await firstValueFrom(service.getDashboardToday());
      expect(stats.transaction_count).toBe(1);
      expect(stats.revenue).toBe(65);
      expect(stats.avg_ticket).toBe(65);
    });

    it('excludes pending transactions from revenue', async () => {
      await firstValueFrom(service.createTransaction({
        items: [{ service_id: 1, service_name: 'Wash & Fold', unit: 'per kg', price: 65, quantity: 1, item_type: 'service' }],
        payment_method: 'cash',
        amount_tendered: 0,
        status: 'pending',
      }));

      const stats = await firstValueFrom(service.getDashboardToday());
      expect(stats.transaction_count).toBe(0);
      expect(stats.revenue).toBe(0);
    });
  });

  describe('customer aggregation', () => {
    async function seedTransactions() {
      await firstValueFrom(service.createTransaction({
        items: [{ service_id: 1, service_name: 'Wash & Fold', unit: 'per kg', price: 65, quantity: 1, item_type: 'service' }],
        payment_method: 'cash', amount_tendered: 65,
        customer_name: 'Alice', phone_number: '09170000001',
      }));
      await firstValueFrom(service.createTransaction({
        items: [{ service_id: 1, service_name: 'Wash & Fold', unit: 'per kg', price: 65, quantity: 1, item_type: 'service' }],
        payment_method: 'cash', amount_tendered: 65,
        customer_name: '', notes: 'Bob (walk-in)',
      }));
      // Same phone as Alice but recorded under a different name later on.
      await firstValueFrom(service.createTransaction({
        items: [{ service_id: 1, service_name: 'Dry Only', unit: 'per load', price: 110, quantity: 1, item_type: 'service' }],
        payment_method: 'cash', amount_tendered: 110,
        customer_name: 'Alicia', phone_number: '09170000001',
      }));
    }

    it('getAllCustomers groups by phone number and counts visits', async () => {
      await seedTransactions();
      const customers = await firstValueFrom(service.getAllCustomers());
      const alice = customers.find(c => c.phone_number === '09170000001');
      expect(alice).toBeTruthy();
      expect(alice!.visit_count).toBe(2);
      expect(alice!.total_spent).toBe(175);
    });

    it('getOrphanCustomers picks up phone-less transactions using the notes fallback', async () => {
      await seedTransactions();
      const orphans = await firstValueFrom(service.getOrphanCustomers());
      expect(orphans.length).toBe(1);
      expect(orphans[0].customer_name).toBe('Bob (walk-in)');
      expect(orphans[0].phone_number).toBe('');
    });

    it('getPhoneNameConflicts flags a phone number used under multiple names', async () => {
      await seedTransactions();
      const conflicts = await firstValueFrom(service.getPhoneNameConflicts());
      const conflict = conflicts.find(c => c.phone_number === '09170000001');
      expect(conflict).toBeTruthy();
      expect(conflict!.identifiers.map(i => i.identifier).sort()).toEqual(['Alice', 'Alicia']);
    });

    it('unifyPhoneIdentity standardizes all transactions for a phone onto one name', async () => {
      await seedTransactions();
      await firstValueFrom(service.unifyPhoneIdentity('09170000001', 'Alice'));
      const conflicts = await firstValueFrom(service.getPhoneNameConflicts());
      expect(conflicts.find(c => c.phone_number === '09170000001')).toBeFalsy();
    });

    it('mergeCustomers moves a phone-less (orphan) customer onto a phoned identity', async () => {
      await seedTransactions();
      await firstValueFrom(service.mergeCustomers('', '09170000099', 'Bob', 'Bob (walk-in)'));
      const orphans = await firstValueFrom(service.getOrphanCustomers());
      expect(orphans.length).toBe(0);
      const customers = await firstValueFrom(service.getAllCustomers());
      expect(customers.find(c => c.phone_number === '09170000099')).toBeTruthy();
    });
  });

  describe('transaction lifecycle', () => {
    it('incrementNotifyCount increases the notify_count', async () => {
      const tx = await firstValueFrom(service.createTransaction({
        items: [{ service_id: 1, service_name: 'Wash & Fold', unit: 'per kg', price: 65, quantity: 1, item_type: 'service' }],
        payment_method: 'gcash', amount_tendered: 65, phone_number: '09171112222',
      }));
      await firstValueFrom(service.incrementNotifyCount(tx.id));
      const reloaded = await firstValueFrom(service.getTransaction(tx.id));
      expect(reloaded.notify_count).toBe(1);
    });

    it('deleteTransaction removes the transaction', async () => {
      const tx = await firstValueFrom(service.createTransaction({
        items: [{ service_id: 1, service_name: 'Wash & Fold', unit: 'per kg', price: 65, quantity: 1, item_type: 'service' }],
        payment_method: 'cash', amount_tendered: 65,
      }));
      await firstValueFrom(service.deleteTransaction(tx.id));
      const stats = await firstValueFrom(service.getDashboardToday());
      expect(stats.transaction_count).toBe(0);
    });
  });
});
