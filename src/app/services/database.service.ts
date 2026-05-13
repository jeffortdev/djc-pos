import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { DashboardStats, LaundryService, LoyaltyEntry, Product, Transaction, TransactionItem, DatabaseBackup, ReportStats, ReportBreakdown, RepeatCustomer, StockEntry } from '../models/models';

const DB_NAME = 'djcpos';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS services (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT    NOT NULL,
    price            REAL    NOT NULL,
    category         TEXT    NOT NULL DEFAULT 'standard',
    unit             TEXT    NOT NULL DEFAULT 'per item',
    active           INTEGER NOT NULL DEFAULT 1,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    loyalty_tracking INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS products (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    type       TEXT    NOT NULL DEFAULT 'Other',
    cost       REAL    NOT NULL DEFAULT 0,
    price      REAL    NOT NULL DEFAULT 0,
    stock      INTEGER NOT NULL DEFAULT 0,
    active     INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime')),
    subtotal        REAL    NOT NULL,
    tax             REAL    NOT NULL DEFAULT 0,
    total           REAL    NOT NULL,
    payment_method  TEXT    NOT NULL DEFAULT 'cash',
    amount_tendered REAL    NOT NULL DEFAULT 0,
    change_due      REAL    NOT NULL DEFAULT 0,
    customer_name   TEXT    NOT NULL DEFAULT '',
    phone_number    TEXT    NOT NULL DEFAULT '',
    notify_count    INTEGER NOT NULL DEFAULT 0,
    notes           TEXT    NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS transaction_items (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    service_id     INTEGER NOT NULL,
    service_name   TEXT    NOT NULL,
    unit           TEXT    NOT NULL,
    price          REAL    NOT NULL,
    quantity       INTEGER NOT NULL DEFAULT 1,
    subtotal       REAL    NOT NULL,
    item_type      TEXT    NOT NULL DEFAULT 'service'
  );

  CREATE TABLE IF NOT EXISTS register_entries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    amount     REAL    NOT NULL,
    note       TEXT    NOT NULL DEFAULT '',
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stock_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    delta       INTEGER NOT NULL,
    reason      TEXT    NOT NULL DEFAULT 'adjustment',
    note        TEXT    NOT NULL DEFAULT '',
    stock_after INTEGER NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS loyalty_redemptions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number  TEXT    NOT NULL,
    customer_name TEXT    NOT NULL DEFAULT '',
    redeemed_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime'))
  );
`;

const SEED_SERVICES = [
  { name: 'Wash & Fold',    price: 65.00,  category: 'wash',      unit: 'per kg',    sort_order: 1 },
  { name: 'Wash Only',      price: 120.00, category: 'wash',      unit: 'per load',  sort_order: 2 },
  { name: 'Dry Only',       price: 110.00, category: 'dry',       unit: 'per load',  sort_order: 3 },
  { name: 'Wash & Dry',     price: 190.00, category: 'wash',      unit: 'per load',  sort_order: 4 },
  { name: 'Press / Iron',   price: 35.00,  category: 'press',     unit: 'per piece', sort_order: 5 },
  { name: 'Dry Cleaning',   price: 180.00, category: 'dry-clean', unit: 'per piece', sort_order: 6 },
  { name: 'Comforter Wash', price: 260.00, category: 'special',   unit: 'per item',  sort_order: 7 },
  { name: 'Pillow Wash',    price: 130.00, category: 'special',   unit: 'per item',  sort_order: 8 },
  { name: 'Shoe Wash',      price: 190.00, category: 'special',   unit: 'per pair',  sort_order: 9 },
  { name: 'Curtain Wash',   price: 280.00, category: 'special',   unit: 'per set',   sort_order: 10 },
];

const SEED_PRODUCTS = [
  { name: 'Detergent Powder',      type: 'Cleaning Supplies', cost: 70,  price: 110, stock: 0, sort_order: 1 },
  { name: 'Fabric Softener',       type: 'Cleaning Supplies', cost: 85,  price: 130, stock: 0, sort_order: 2 },
  { name: 'Laundry Bag',           type: 'Accessories',      cost: 120, price: 185, stock: 0, sort_order: 3 },
  { name: 'Stain Remover Spray',   type: 'Detergent',        cost: 140, price: 205, stock: 0, sort_order: 4 },
  { name: 'Garment Protect Cover', type: 'Dry Goods',        cost: 95,  price: 150, stock: 0, sort_order: 5 },
];

// ── localStorage-based store for browser development ──────────────────────────
class LocalStore {
  private read<T>(key: string, def: T): T {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? def; } catch { return def; }
  }
  private write(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)); }

  getServices(): LaundryService[] { return this.read<LaundryService[]>('lm_services', []); }
  saveServices(v: LaundryService[]) { this.write('lm_services', v); }
  getProducts(): Product[] { return this.read<Product[]>('lm_products', []); }
  saveProducts(v: Product[]) { this.write('lm_products', v); }
  getTransactions(): Transaction[] { return this.read<Transaction[]>('lm_transactions', []); }
  saveTransactions(v: Transaction[]) { this.write('lm_transactions', v); }
  getStockHistory(): StockEntry[] { return this.read<StockEntry[]>('lm_stock_history', []); }
  saveStockHistory(v: StockEntry[]) { this.write('lm_stock_history', v); }
  getLoyaltyRedemptions(): { phone_number: string; customer_name: string; redeemed_at: string }[] {
    return this.read<{ phone_number: string; customer_name: string; redeemed_at: string }[]>('lm_loyalty_redemptions', []);
  }
  saveLoyaltyRedemptions(v: { phone_number: string; customer_name: string; redeemed_at: string }[]) {
    this.write('lm_loyalty_redemptions', v);
  }
  getRegisterEntries(): { id: number; amount: number; note: string; created_at: string }[] {
    return this.read('lm_register_entries', []);
  }
  saveRegisterEntries(v: { id: number; amount: number; note: string; created_at: string }[]) {
    this.write('lm_register_entries', v);
  }
  getSetting(key: string, def = ''): string {
    const raw = localStorage.getItem(`lm_setting_${key}`);
    return raw !== null ? raw : def;
  }
  setSetting(key: string, value: string) {
    localStorage.setItem(`lm_setting_${key}`, value);
  }
  nextId(list: { id: number }[]): number { return list.length ? Math.max(...list.map(x => x.id)) + 1 : 1; }
}

// ── SQLite-backed store for Capacitor (Android / iOS) ─────────────────────────
class SQLiteStore {
  private db!: import('@capacitor-community/sqlite').SQLiteDBConnection;
  ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private async init() {
    const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    this.db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
    await this.db.open();
    await this.db.execute(SCHEMA);
  }

  async query(sql: string, params: unknown[] = []) {
    return this.db.query(sql, params as any[]);
  }

  async run(sql: string, params: unknown[] = []) {
    return this.db.run(sql, params as any[]);
  }

  async execute(sql: string) {
    return this.db.execute(sql);
  }
}

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private local = new LocalStore();
  private sqliteStore?: SQLiteStore;
  private ready!: Promise<void>;
  private isNative = false;
  private recoveryMessage = new BehaviorSubject<string | null>(null);
  public recovery$ = this.recoveryMessage.asObservable();

  constructor(private platform: Platform) {
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    await this.platform.ready();
    this.isNative = this.platform.is('capacitor');

    if (this.isNative) {
      this.sqliteStore = new SQLiteStore();
      await this.sqliteStore.ready;
      await this.trySeedSQLite();
    } else {
      this.trySeedLocal();
    }
  }

  private trySeedLocal() {
    const initialized = localStorage.getItem('lm_initialized') === '1';
    const services = this.local.getServices();
    const products = this.local.getProducts();

    if (services.length === 0 || products.length === 0) {
      if (initialized) {
        this.notifyRecovery('Local data was missing or corrupted. The app has restored default data.');
      }

      const seededServices: LaundryService[] = SEED_SERVICES.map((s, i) => ({ ...s, id: i + 1, active: 1, loyalty_tracking: 1 }));
      const seededProducts: Product[] = SEED_PRODUCTS.map((p, i) => ({
        ...p,
        id: i + 1,
        active: 1,
      }));

      this.local.saveServices(seededServices);
      this.local.saveProducts(seededProducts);
      localStorage.setItem('lm_initialized', '1');
    } else if (!initialized) {
      localStorage.setItem('lm_initialized', '1');
    }

    // Schema migration: add loyalty_tracking=1 to any existing service that lacks it.
    // All services are opted-in by default; only explicit user action opts them out.
    const existing = this.local.getServices();
    if (existing.some(s => (s as any).loyalty_tracking == null)) {
      this.local.saveServices(
        existing.map(s => ({ ...s, loyalty_tracking: (s as any).loyalty_tracking ?? 1 }))
      );
    }
  }

  private async trySeedSQLite(): Promise<void> {
    try {
      await this.seedSQLiteIfEmpty();
    } catch (error) {
      await this.recoverSqliteDatabase(error);
    }
  }

  private async seedSQLiteIfEmpty(): Promise<void> {
    const r = await this.sqliteStore!.query('SELECT COUNT(*) as c FROM services');
    if ((r.values?.[0]?.c ?? 0) === 0) {
      for (const s of SEED_SERVICES) {
        await this.sqliteStore!.run(
          'INSERT INTO services (name, price, category, unit, sort_order) VALUES (?,?,?,?,?)',
          [s.name, s.price, s.category, s.unit, s.sort_order]
        );
      }
    }

    const p = await this.sqliteStore!.query('SELECT COUNT(*) as c FROM products');
    if ((p.values?.[0]?.c ?? 0) === 0) {
      for (const product of SEED_PRODUCTS) {
        await this.sqliteStore!.run(
          'INSERT INTO products (name, type, cost, price, stock, active, sort_order) VALUES (?,?,?,?,?,?,?)',
          [product.name, product.type, product.cost, product.price, product.stock, 1, product.sort_order]
        );
      }
    }

    const pinR = await this.sqliteStore!.query("SELECT value FROM settings WHERE key='register_pin'");
    if (!pinR.values?.length) {
      await this.sqliteStore!.run("INSERT INTO settings (key, value) VALUES ('register_pin','1234')");
    }

    const cols = await this.sqliteStore!.query("PRAGMA table_info(transactions)");
    const hasPhone = (cols.values ?? []).some((c: { name: string }) => c.name === 'phone_number');
    if (!hasPhone) {
      await this.sqliteStore!.run("ALTER TABLE transactions ADD COLUMN phone_number TEXT NOT NULL DEFAULT ''");
    }
    const hasNotifyCount = (cols.values ?? []).some((c: { name: string }) => c.name === 'notify_count');
    if (!hasNotifyCount) {
      await this.sqliteStore!.run('ALTER TABLE transactions ADD COLUMN notify_count INTEGER NOT NULL DEFAULT 0');
    }

    const hasCustomerName = (cols.values ?? []).some((c: { name: string }) => c.name === 'customer_name');
    if (!hasCustomerName) {
      await this.sqliteStore!.run("ALTER TABLE transactions ADD COLUMN customer_name TEXT NOT NULL DEFAULT ''");
    }

    // Migrate: add loyalty_tracking column to services if missing, then ensure all rows are set to 1
    const svcCols = await this.sqliteStore!.query("PRAGMA table_info(services)");
    const hasLoyaltyTracking = (svcCols.values ?? []).some((c: { name: string }) => c.name === 'loyalty_tracking');
    if (!hasLoyaltyTracking) {
      await this.sqliteStore!.run("ALTER TABLE services ADD COLUMN loyalty_tracking INTEGER NOT NULL DEFAULT 1");
      // Explicitly set every pre-existing row to 1 (DEFAULT handles new rows; this is belt-and-suspenders)
      await this.sqliteStore!.run("UPDATE services SET loyalty_tracking = 1 WHERE loyalty_tracking IS NULL");
    }

    const itemCols = await this.sqliteStore!.query("PRAGMA table_info(transaction_items)");
    const hasItemType = (itemCols.values ?? []).some((c: { name: string }) => c.name === 'item_type');
    if (!hasItemType) {
      await this.sqliteStore!.run("ALTER TABLE transaction_items ADD COLUMN item_type TEXT NOT NULL DEFAULT 'service'");
    }

    // Migrate: create stock_history table if missing (added after initial release)
    const histTbl = await this.sqliteStore!.query("SELECT name FROM sqlite_master WHERE type='table' AND name='stock_history'");
    if (!histTbl.values?.length) {
      await this.sqliteStore!.execute(`
        CREATE TABLE IF NOT EXISTS stock_history (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          delta       INTEGER NOT NULL,
          reason      TEXT    NOT NULL DEFAULT 'adjustment',
          note        TEXT    NOT NULL DEFAULT '',
          stock_after INTEGER NOT NULL,
          created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime'))
        )
      `);
    }

    // Migrate: create loyalty_redemptions table if missing (added after initial release)
    const loyaltyTbl = await this.sqliteStore!.query("SELECT name FROM sqlite_master WHERE type='table' AND name='loyalty_redemptions'");
    if (!loyaltyTbl.values?.length) {
      await this.sqliteStore!.execute(`
        CREATE TABLE IF NOT EXISTS loyalty_redemptions (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          phone_number  TEXT    NOT NULL,
          customer_name TEXT    NOT NULL DEFAULT '',
          redeemed_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime'))
        )
      `);
    }
  }

  private async seedIfEmpty(): Promise<void> {
    // unused — replaced by trySeedLocal / trySeedSQLite
  }

  private async recoverSqliteDatabase(error: unknown): Promise<void> {
    this.notifyRecovery('Database appeared missing or corrupted. The app has restored defaults.');
    if (!this.sqliteStore) return;

    await this.sqliteStore.execute(SCHEMA);
    await this.seedSQLiteIfEmpty();
  }

  private notifyRecovery(message: string): void {
    this.recoveryMessage.next(message);
  }

  // ── Services ────────────────────────────────────────────────────────────────

  getActiveServices(): Observable<LaundryService[]> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        return this.local.getServices().filter(s => s.active === 1).sort((a, b) => a.sort_order - b.sort_order);
      }
      const r = await this.sqliteStore!.query('SELECT * FROM services WHERE active=1 ORDER BY sort_order');
      return (r.values ?? []) as LaundryService[];
    }));
  }

  getAllServices(): Observable<LaundryService[]> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        return [...this.local.getServices()].sort((a, b) => a.sort_order - b.sort_order);
      }
      const r = await this.sqliteStore!.query('SELECT * FROM services ORDER BY sort_order');
      return (r.values ?? []) as LaundryService[];
    }));
  }

  createService(s: Partial<LaundryService>): Observable<{ id: number }> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        const list = this.local.getServices();
        const newItem: LaundryService = {
          id: this.local.nextId(list), name: s.name!, price: s.price!,
          category: s.category ?? 'standard', unit: s.unit ?? 'per item',
          active: 1, sort_order: s.sort_order ?? 0, loyalty_tracking: s.loyalty_tracking ?? 1
        };
        list.push(newItem);
        this.local.saveServices(list);
        return { id: newItem.id };
      }
      const r = await this.sqliteStore!.run(
        'INSERT INTO services (name, price, category, unit, sort_order, loyalty_tracking) VALUES (?,?,?,?,?,?)',
        [s.name, s.price, s.category ?? 'standard', s.unit ?? 'per item', s.sort_order ?? 0, s.loyalty_tracking ?? 1]
      );
      return { id: r.changes?.lastId ?? 0 };
    }));
  }

  updateService(id: number, s: Partial<LaundryService>): Observable<{ ok: boolean }> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        const list = this.local.getServices().map(x =>
          x.id === id ? { ...x, ...s } : x
        );
        this.local.saveServices(list);
        return { ok: true };
      }
      await this.sqliteStore!.run(
        'UPDATE services SET name=?, price=?, category=?, unit=?, active=?, sort_order=?, loyalty_tracking=? WHERE id=?',
        [s.name, s.price, s.category, s.unit, s.active ?? 1, s.sort_order ?? 0, s.loyalty_tracking ?? 1, id]
      );
      return { ok: true };
    }));
  }

  deleteService(id: number): Observable<{ ok: boolean }> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        this.local.saveServices(this.local.getServices().filter(x => x.id !== id));
        return { ok: true };
      }
      await this.sqliteStore!.run('DELETE FROM services WHERE id=?', [id]);
      return { ok: true };
    }));
  }

  getActiveProducts(): Observable<Product[]> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        return this.local.getProducts().filter(p => p.active === 1).sort((a, b) => a.sort_order - b.sort_order);
      }
      const r = await this.sqliteStore!.query('SELECT * FROM products WHERE active=1 ORDER BY sort_order');
      return (r.values ?? []) as Product[];
    }));
  }

  getAllProducts(): Observable<Product[]> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        return [...this.local.getProducts()].sort((a, b) => a.sort_order - b.sort_order);
      }
      const r = await this.sqliteStore!.query('SELECT * FROM products ORDER BY sort_order');
      return (r.values ?? []) as Product[];
    }));
  }

  createProduct(p: Partial<Product>): Observable<{ id: number }> {
    return from(this.ready.then(async () => {
      const initialStock = p.stock ?? 0;
      if (!this.isNative) {
        const list = this.local.getProducts();
        const newItem: Product = {
          id: this.local.nextId(list), name: p.name!, type: p.type ?? 'Other', cost: p.cost ?? 0,
          price: p.price ?? 0, stock: initialStock, active: p.active ? 1 : 0, sort_order: p.sort_order ?? 0
        };
        list.push(newItem);
        this.local.saveProducts(list);
        if (initialStock > 0) {
          const history = this.local.getStockHistory();
          history.push({
            id: this.local.nextId(history), product_id: newItem.id, delta: initialStock,
            reason: 'initial', note: 'Opening stock', stock_after: initialStock,
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          });
          this.local.saveStockHistory(history);
        }
        return { id: newItem.id };
      }
      const r = await this.sqliteStore!.run(
        'INSERT INTO products (name, type, cost, price, stock, active, sort_order) VALUES (?,?,?,?,?,?,?)',
        [p.name, p.type ?? 'Other', p.cost ?? 0, initialStock, initialStock, p.active ? 1 : 0, p.sort_order ?? 0]
      );
      const newId = r.changes?.lastId ?? 0;
      if (initialStock > 0) {
        await this.sqliteStore!.run(
          'INSERT INTO stock_history (product_id, delta, reason, note, stock_after) VALUES (?,?,?,?,?)',
          [newId, initialStock, 'initial', 'Opening stock', initialStock]
        );
      }
      return { id: newId };
    }));
  }

  updateProduct(id: number, p: Partial<Product>): Observable<{ ok: boolean }> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        const list = this.local.getProducts().map(x => x.id === id ? { ...x, ...p } : x);
        this.local.saveProducts(list);
        return { ok: true };
      }
      await this.sqliteStore!.run(
        'UPDATE products SET name=?, type=?, cost=?, price=?, stock=?, active=?, sort_order=? WHERE id=?',
        [p.name, p.type, p.cost, p.price, p.stock, p.active ? 1 : 0, p.sort_order ?? 0, id]
      );
      return { ok: true };
    }));
  }

  deleteProduct(id: number): Observable<{ ok: boolean }> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        this.local.saveProducts(this.local.getProducts().filter(x => x.id !== id));
        return { ok: true };
      }
      await this.sqliteStore!.run('DELETE FROM products WHERE id=?', [id]);
      return { ok: true };
    }));
  }

  adjustProductStock(id: number, delta: number, reason = 'adjustment', note = ''): Observable<{ ok: boolean }> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        const list = this.local.getProducts();
        const product = list.find(x => x.id === id);
        if (!product) return { ok: false };
        const newStock = Math.max(0, product.stock + delta);
        this.local.saveProducts(list.map(x => x.id === id ? { ...x, stock: newStock } : x));
        const history = this.local.getStockHistory();
        history.push({
          id: this.local.nextId(history), product_id: id, delta,
          reason, note, stock_after: newStock,
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });
        this.local.saveStockHistory(history);
        return { ok: true };
      }
      await this.sqliteStore!.run('UPDATE products SET stock = MAX(0, stock + ?) WHERE id=?', [delta, id]);
      const r = await this.sqliteStore!.query('SELECT stock FROM products WHERE id=?', [id]);
      const stockAfter = r.values?.[0]?.stock ?? 0;
      await this.sqliteStore!.run(
        'INSERT INTO stock_history (product_id, delta, reason, note, stock_after) VALUES (?,?,?,?,?)',
        [id, delta, reason, note, stockAfter]
      );
      return { ok: true };
    }));
  }

  getStockHistory(productId: number, limit = 20): Observable<StockEntry[]> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        const products = this.local.getProducts();
        return this.local.getStockHistory()
          .filter(e => e.product_id === productId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, limit)
          .map(e => ({ ...e, product_name: products.find(p => p.id === e.product_id)?.name ?? '' }));
      }
      const r = await this.sqliteStore!.query(
        `SELECT sh.*, p.name AS product_name FROM stock_history sh
         LEFT JOIN products p ON p.id = sh.product_id
         WHERE sh.product_id=? ORDER BY sh.created_at DESC LIMIT ?`,
        [productId, limit]
      );
      return (r.values ?? []) as StockEntry[];
    }));
  }

  getAllStockHistory(limit = 50, offset = 0): Observable<StockEntry[]> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        const products = this.local.getProducts();
        const all = this.local.getStockHistory()
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(offset, offset + limit);
        return all.map(e => ({ ...e, product_name: products.find(p => p.id === e.product_id)?.name ?? '' }));
      }
      const r = await this.sqliteStore!.query(
        `SELECT sh.*, p.name AS product_name FROM stock_history sh
         LEFT JOIN products p ON p.id = sh.product_id
         ORDER BY sh.created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      return (r.values ?? []) as StockEntry[];
    }));
  }

  // ── Transactions ─────────────────────────────────────────────────────────────

  getTransactions(limit = 50, offset = 0): Observable<Transaction[]> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        const all = [...this.local.getTransactions()].sort((a, b) => b.created_at.localeCompare(a.created_at));
        return all.slice(offset, offset + limit);
      }
      const r = await this.sqliteStore!.query(
        'SELECT * FROM transactions ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]
      );
      return (r.values ?? []) as Transaction[];
    }));
  }

  getTransaction(id: number): Observable<Transaction> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        return this.local.getTransactions().find(t => t.id === id)!;
      }
      const txR = await this.sqliteStore!.query('SELECT * FROM transactions WHERE id=?', [id]);
      const tx = txR.values?.[0] as Transaction;
      const itemsR = await this.sqliteStore!.query('SELECT * FROM transaction_items WHERE transaction_id=?', [id]);
      tx.items = (itemsR.values ?? []) as any;
      return tx;
    }));
  }

  getTransactionsByPhone(phone: string): Observable<Transaction[]> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        return [...this.local.getTransactions()]
          .filter(t => t.phone_number === phone)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
      }
      const r = await this.sqliteStore!.query(
        'SELECT * FROM transactions WHERE phone_number=? ORDER BY created_at DESC',
        [phone]
      );
      return (r.values ?? []) as Transaction[];
    }));
  }

  /**
   * Returns only the transactions for a phone number that qualify for loyalty tracking:
   * – created after the last redemption for this phone (if any)
   * – contains at least one service item whose service has loyalty_tracking = 1
   */
  getLoyaltyTransactionsByPhone(phone: string): Observable<Transaction[]> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        const allTx = this.local.getTransactions();
        const redemptions = this.local.getLoyaltyRedemptions();
        const cutoff = redemptions
          .filter(r => r.phone_number === phone)
          .map(r => r.redeemed_at)
          .sort()
          .pop() ?? null;
        const loyaltyServiceIds = new Set(
          this.local.getServices()
            .filter(s => (s.loyalty_tracking ?? 1) === 1)
            .map(s => s.id)
        );
        return allTx
          .filter(t => t.phone_number === phone)
          .filter(t => !cutoff || t.created_at > cutoff)
          .filter(t => (t.items ?? []).some(
            item => item.item_type !== 'product' && loyaltyServiceIds.has(item.service_id)
          ))
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
      }
      const r = await this.sqliteStore!.query(
        `SELECT DISTINCT t.*
         FROM transactions t
         JOIN transaction_items ti ON ti.transaction_id = t.id
         JOIN services s ON s.id = ti.service_id
         LEFT JOIN (
           SELECT MAX(redeemed_at) AS last_redeemed
           FROM loyalty_redemptions
           WHERE phone_number = ?
         ) lr ON 1=1
         WHERE t.phone_number = ?
           AND ti.item_type = 'service'
           AND s.loyalty_tracking = 1
           AND (lr.last_redeemed IS NULL OR t.created_at > lr.last_redeemed)
         ORDER BY t.created_at DESC`,
        [phone, phone]
      );
      const txs = (r.values ?? []) as Transaction[];
      if (txs.length) {
        const ids = txs.map(t => t.id).join(',');
        const itemsR = await this.sqliteStore!.query(
          `SELECT * FROM transaction_items WHERE transaction_id IN (${ids}) ORDER BY id`
        );
        const allItems = (itemsR.values ?? []) as TransactionItem[];
        for (const tx of txs) {
          tx.items = allItems.filter(i => i.transaction_id === tx.id);
        }
      }
      return txs;
    }));
  }

  /** Returns the most recently used customer_name for this phone, or '' if none. */
  getKnownNameForPhone(phone: string): Observable<string> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        const tx = [...this.local.getTransactions()]
          .filter(t => t.phone_number === phone && !!t.customer_name)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        return tx?.customer_name ?? '';
      }
      try {
        const r = await this.sqliteStore!.query(
          `SELECT customer_name FROM transactions
           WHERE phone_number=? AND customer_name != ''
           ORDER BY created_at DESC LIMIT 1`,
          [phone]
        );
        return (r.values?.[0]?.customer_name ?? '') as string;
      } catch { return ''; }
    }));
  }

  searchCustomers(query: string): Observable<{ name: string; phone_number: string }[]> {
    return from(this.ready.then(async () => {
      const q = query.toLowerCase();
      if (!this.isNative) {
        const seen = new Map<string, { name: string; phone_number: string }>();
        const all = [...this.local.getTransactions()]
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        for (const tx of all) {
          const name = tx.customer_name || tx.notes || '';
          if (!name) continue;
          const key = name.toLowerCase();
          if (key.includes(q) && !seen.has(key)) {
            seen.set(key, { name, phone_number: tx.phone_number ?? '' });
          }
        }
        return Array.from(seen.values()).slice(0, 8);
      }
      try {
        const r = await this.sqliteStore!.query(
          `SELECT COALESCE(NULLIF(customer_name,''), NULLIF(notes,'')) AS name, phone_number
           FROM transactions t1
           WHERE COALESCE(NULLIF(customer_name,''), NULLIF(notes,'')) IS NOT NULL
             AND LOWER(COALESCE(NULLIF(customer_name,''), NULLIF(notes,''))) LIKE ?
             AND created_at = (
               SELECT MAX(t2.created_at) FROM transactions t2
               WHERE LOWER(COALESCE(NULLIF(t2.customer_name,''), NULLIF(t2.notes,'')))
                   = LOWER(COALESCE(NULLIF(t1.customer_name,''), NULLIF(t1.notes,'')))
             )
           ORDER BY name
           LIMIT 8`,
          [`%${q}%`]
        );
        return (r.values ?? []).map((row: any) => ({
          name: row.name as string,
          phone_number: row.phone_number as string,
        }));
      } catch {
        // Column not yet present on a very old schema — return empty gracefully
        return [];
      }
    }));
  }

  createTransaction(payload: {
    items: { service_id: number; service_name: string; unit: string; price: number; quantity: number; item_type: 'service' | 'product' }[];
    payment_method: string;
    amount_tendered: number;
    customer_name?: string;
    phone_number?: string;
    notes?: string;
  }): Observable<Transaction> {
    return from(this.ready.then(async () => {
      const { items, payment_method, amount_tendered, notes, phone_number, customer_name } = payload;
      const subtotal = parseFloat(items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2));
      const total = subtotal;
      const change_due = parseFloat(Math.max(0, amount_tendered - total).toFixed(2));

      if (!this.isNative) {
        const list = this.local.getTransactions();
        const id = this.local.nextId(list);
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const tx: Transaction = {
          id, created_at: now, subtotal, tax: 0, total,
          payment_method: payment_method ?? 'cash',
          amount_tendered: amount_tendered ?? total,
          change_due, customer_name: customer_name ?? '', phone_number: phone_number ?? '', notes: notes ?? '',
          items: items.map((item, i) => ({
            id: i + 1, transaction_id: id,
            service_id: item.service_id, service_name: item.service_name,
            unit: item.unit, price: item.price, quantity: item.quantity,
            subtotal: item.price * item.quantity,
            item_type: item.item_type
          }))
        };
        list.push(tx);
        this.local.saveTransactions(list);
        return tx;
      }

      const txR = await this.sqliteStore!.run(
        `INSERT INTO transactions (subtotal, tax, total, payment_method, amount_tendered, change_due, customer_name, phone_number, notes)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [subtotal, 0, total, payment_method ?? 'cash', amount_tendered ?? total, change_due, customer_name ?? '', phone_number ?? '', notes ?? '']
      );
      const txId = txR.changes?.lastId ?? 0;
      for (const item of items) {
        await this.sqliteStore!.run(
          `INSERT INTO transaction_items (transaction_id, service_id, service_name, unit, price, quantity, subtotal, item_type)
           VALUES (?,?,?,?,?,?,?,?)`,
          [txId, item.service_id, item.service_name, item.unit, item.price, item.quantity, item.price * item.quantity, item.item_type]
        );
      }
      const savedTxR = await this.sqliteStore!.query('SELECT * FROM transactions WHERE id=?', [txId]);
      const savedTx = savedTxR.values?.[0] as Transaction;
      const savedItemsR = await this.sqliteStore!.query('SELECT * FROM transaction_items WHERE transaction_id=?', [txId]);
      savedTx.items = (savedItemsR.values ?? []) as any;
      return savedTx;
    }));
  }

  incrementNotifyCount(id: number): Observable<{ ok: boolean }> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        const list = this.local.getTransactions().map(t =>
          t.id === id ? { ...t, notify_count: (t.notify_count ?? 0) + 1 } : t
        );
        this.local.saveTransactions(list);
        return { ok: true };
      }
      await this.sqliteStore!.run(
        'UPDATE transactions SET notify_count = notify_count + 1 WHERE id=?', [id]
      );
      return { ok: true };
    }));
  }

  deleteTransaction(id: number): Observable<{ ok: boolean }> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        this.local.saveTransactions(this.local.getTransactions().filter(t => t.id !== id));
        return { ok: true };
      }
      await this.sqliteStore!.run('DELETE FROM transactions WHERE id=?', [id]);
      return { ok: true };
    }));
  }

  // ── Settings ─────────────────────────────────────────────────────────────────

  getSetting(key: string, defaultValue = ''): Observable<string> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        return this.local.getSetting(key, defaultValue);
      }
      const r = await this.sqliteStore!.query('SELECT value FROM settings WHERE key=?', [key]);
      return (r.values?.[0]?.value ?? defaultValue) as string;
    }));
  }

  setSetting(key: string, value: string): Observable<void> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        this.local.setSetting(key, value);
        return;
      }
      await this.sqliteStore!.run(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)', [key, value]
      );
    }));
  }

  getBackupData(): Observable<DatabaseBackup> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        const settings = Object.keys(localStorage)
          .filter(k => k.startsWith('lm_setting_'))
          .map(key => ({ key: key.replace('lm_setting_', ''), value: localStorage.getItem(key) ?? '' }));

        return {
          version: 1,
          services: this.local.getServices(),
          products: this.local.getProducts(),
          transactions: this.local.getTransactions(),
          registerEntries: this.local.getRegisterEntries(),
          settings,
        };
      }

      const [servicesRes, productsRes, txRes, itemRes, registerRes, settingsRes] = await Promise.all([
        this.sqliteStore!.query('SELECT * FROM services ORDER BY sort_order'),
        this.sqliteStore!.query('SELECT * FROM products ORDER BY sort_order'),
        this.sqliteStore!.query('SELECT * FROM transactions ORDER BY id'),
        this.sqliteStore!.query('SELECT * FROM transaction_items ORDER BY id'),
        this.sqliteStore!.query('SELECT * FROM register_entries ORDER BY id'),
        this.sqliteStore!.query('SELECT key, value FROM settings'),
      ]);

      const transactions = (txRes.values ?? []) as Transaction[];
      const items = (itemRes.values ?? []) as TransactionItem[];
      const itemsByTransaction = items.reduce((map, item) => {
        if (!map[item.transaction_id]) map[item.transaction_id] = [];
        map[item.transaction_id].push(item);
        return map;
      }, {} as Record<number, TransactionItem[]>);

      for (const transaction of transactions) {
        transaction.items = itemsByTransaction[transaction.id] ?? [];
      }

      return {
        version: 1,
        services: (servicesRes.values ?? []) as LaundryService[],
        products: (productsRes.values ?? []) as Product[],
        transactions,
        registerEntries: (registerRes.values ?? []) as { id: number; amount: number; note: string; created_at: string }[],
        settings: (settingsRes.values ?? []) as { key: string; value: string }[],
      };
    }));
  }

  restoreBackup(backup: DatabaseBackup): Observable<void> {
    return from(this.ready.then(async () => {
      if (!backup || !Array.isArray(backup.services) || !Array.isArray(backup.products)) {
        throw new Error('Invalid backup file.');
      }

      if (!this.isNative) {
        Object.keys(localStorage)
          .filter(k => k.startsWith('lm_setting_'))
          .forEach(k => localStorage.removeItem(k));

        // Normalise services from old backups that pre-date loyalty_tracking
        this.local.saveServices(
          backup.services.map(s => ({ ...s, loyalty_tracking: (s as any).loyalty_tracking ?? 1 }))
        );
        this.local.saveProducts(backup.products);
        this.local.saveTransactions(backup.transactions);
        this.local.saveRegisterEntries(backup.registerEntries);
        for (const setting of backup.settings) {
          localStorage.setItem(`lm_setting_${setting.key}`, setting.value);
        }
        return;
      }

      await this.sqliteStore!.run('DELETE FROM transaction_items');
      await this.sqliteStore!.run('DELETE FROM transactions');
      await this.sqliteStore!.run('DELETE FROM services');
      await this.sqliteStore!.run('DELETE FROM products');
      await this.sqliteStore!.run('DELETE FROM register_entries');
      await this.sqliteStore!.run('DELETE FROM settings');

      for (const service of backup.services) {
        await this.sqliteStore!.run(
          'INSERT INTO services (id, name, price, category, unit, active, sort_order, loyalty_tracking) VALUES (?,?,?,?,?,?,?,?)',
          [service.id, service.name, service.price, service.category, service.unit, service.active, service.sort_order, (service as any).loyalty_tracking ?? 1]
        );
      }

      for (const product of backup.products) {
        await this.sqliteStore!.run(
          'INSERT INTO products (id, name, type, cost, price, stock, active, sort_order) VALUES (?,?,?,?,?,?,?,?)',
          [product.id, product.name, product.type, product.cost, product.price, product.stock, product.active, product.sort_order]
        );
      }

      for (const transaction of backup.transactions) {
        await this.sqliteStore!.run(
          'INSERT INTO transactions (id, created_at, subtotal, tax, total, payment_method, amount_tendered, change_due, phone_number, notify_count, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [transaction.id, transaction.created_at, transaction.subtotal, transaction.tax, transaction.total,
           transaction.payment_method, transaction.amount_tendered, transaction.change_due,
           transaction.phone_number ?? '', transaction.notify_count ?? 0, transaction.notes]
        );

        for (const item of transaction.items ?? []) {
          await this.sqliteStore!.run(
            'INSERT INTO transaction_items (id, transaction_id, service_id, service_name, unit, price, quantity, subtotal, item_type) VALUES (?,?,?,?,?,?,?,?,?)',
            [item.id, item.transaction_id, item.service_id, item.service_name, item.unit,
             item.price, item.quantity, item.subtotal, item.item_type]
          );
        }
      }

      for (const entry of backup.registerEntries) {
        await this.sqliteStore!.run(
          'INSERT INTO register_entries (id, amount, note, created_at) VALUES (?,?,?,?)',
          [entry.id, entry.amount, entry.note, entry.created_at]
        );
      }

      for (const setting of backup.settings) {
        await this.sqliteStore!.run(
          'INSERT INTO settings (key, value) VALUES (?,?)',
          [setting.key, setting.value]
        );
      }
    }));
  }

  // ── Register ─────────────────────────────────────────────────────────────────
  addRegisterCash(amount: number, note = ''): Observable<void> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        const entries = this.local.getRegisterEntries();
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        entries.push({ id: this.local.nextId(entries), amount, note, created_at: now });
        this.local.saveRegisterEntries(entries);
        return;
      }
      await this.sqliteStore!.run(
        'INSERT INTO register_entries (amount, note) VALUES (?,?)', [amount, note]
      );
    }));
  }

  getRegisterEntries(): Observable<{ id: number; amount: number; note: string; created_at: string }[]> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        return [...this.local.getRegisterEntries()]
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
      }
      const r = await this.sqliteStore!.query(
        'SELECT * FROM register_entries ORDER BY created_at DESC'
      );
      return (r.values ?? []) as { id: number; amount: number; note: string; created_at: string }[];
    }));
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────

  getDashboardToday(): Observable<DashboardStats> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        const today = new Date().toISOString().substring(0, 10);
        const allTx = this.local.getTransactions();
        const txToday = allTx.filter(t => t.created_at.startsWith(today));
        const revenue = txToday.reduce((s, t) => s + t.total, 0);
        const avg_ticket = txToday.length ? revenue / txToday.length : 0;
        const serviceMap: Record<string, { service_name: string; quantity: number; revenue: number }> = {};
        for (const tx of txToday) {
          for (const item of tx.items ?? []) {
            if (!serviceMap[item.service_name]) serviceMap[item.service_name] = { service_name: item.service_name, quantity: 0, revenue: 0 };
            serviceMap[item.service_name].quantity += item.quantity;
            serviceMap[item.service_name].revenue += item.subtotal;
          }
        }
        const topServices = Object.values(serviceMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        const cashFromTx = allTx.filter(t => t.payment_method === 'cash').reduce((s, t) => s + t.total, 0);
        const cashAdded = this.local.getRegisterEntries().reduce((s, e) => s + e.amount, 0);
        return {
          transaction_count: txToday.length, revenue, avg_ticket,
          register_balance: parseFloat((cashAdded + cashFromTx).toFixed(2)),
          topServices,
          recentTransactions: [...txToday].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)
        } as DashboardStats;
      }

      const todayR = await this.sqliteStore!.query(`
        SELECT COUNT(*) as transaction_count, COALESCE(SUM(total),0) as revenue, COALESCE(AVG(total),0) as avg_ticket
        FROM transactions WHERE date(created_at) = date('now','localtime')
      `);
      const topR = await this.sqliteStore!.query(`
        SELECT ti.service_name, SUM(ti.quantity) as quantity, SUM(ti.subtotal) as revenue
        FROM transaction_items ti JOIN transactions t ON t.id = ti.transaction_id
        WHERE date(t.created_at) = date('now','localtime')
        GROUP BY ti.service_name ORDER BY revenue DESC LIMIT 5
      `);
      const recentR = await this.sqliteStore!.query(`
        SELECT * FROM transactions WHERE date(created_at) = date('now','localtime')
        ORDER BY created_at DESC LIMIT 5
      `);
      const regR = await this.sqliteStore!.query(
        `SELECT COALESCE(SUM(amount),0) as cash_added FROM register_entries`
      );
      const cashTxR = await this.sqliteStore!.query(
        `SELECT COALESCE(SUM(total),0) as cash_from_tx FROM transactions WHERE payment_method='cash'`
      );
      const register_balance = parseFloat(
        ((regR.values?.[0]?.cash_added ?? 0) + (cashTxR.values?.[0]?.cash_from_tx ?? 0)).toFixed(2)
      );
      return {
        ...(todayR.values?.[0] ?? { transaction_count: 0, revenue: 0, avg_ticket: 0 }),
        register_balance,
        topServices: (topR.values ?? []) as any,
        recentTransactions: (recentR.values ?? []) as Transaction[],
      } as DashboardStats;
    }));
  }

  // ── Reports ─────────────────────────────────────────────────────────────────

  getReportStats(
    period: 'today' | 'week' | 'month' | 'custom',
    paymentMethod = 'all',
    dateFrom?: string,
    dateTo?: string,
  ): Observable<ReportStats> {
    return from(this.ready.then(async () => {
      if (!this.isNative) return this.buildReportLocal(period, paymentMethod, dateFrom, dateTo);
      return this.buildReportSQLite(period, paymentMethod, dateFrom, dateTo);
    }));
  }

  private calculateDayCount(period: 'today' | 'week' | 'month' | 'custom', dateFrom?: string, dateTo?: string): number {
    if (period === 'today') return 1;
    if (period === 'week') return 7;
    if (period === 'month') return new Date().getDate();
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date();
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : new Date();
    return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  }

  private buildReportLocal(
    period: 'today' | 'week' | 'month' | 'custom',
    paymentMethod = 'all',
    dateFrom?: string,
    dateTo?: string,
  ): ReportStats {
    const allTx = this.local.getTransactions();
    const now = new Date();
    let currStart: Date, currEnd: Date, prevStart: Date, prevEnd: Date;

    if (period === 'today') {
      currStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      currEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      prevEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (period === 'week') {
      currEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      currStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      prevEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 23, 59, 59, 999);
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13, 0, 0, 0, 0);
    } else if (period === 'month') {
      currStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      currEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else {
      const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const to   = dateTo   ? new Date(dateTo   + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      currStart = from;
      currEnd   = to;
      const diff = to.getTime() - from.getTime();
      prevEnd   = new Date(from.getTime() - 1);
      prevStart = new Date(from.getTime() - diff - 86400000);
    }

    const inRange = (tx: Transaction, s: Date, e: Date) => {
      const d = new Date(tx.created_at.replace(' ', 'T'));
      return d >= s && d <= e;
    };
    const safeMethod = ['cash', 'card', 'gcash'].includes(paymentMethod) ? paymentMethod : null;
    const methodMatch = (tx: Transaction) => !safeMethod || tx.payment_method === safeMethod;
    const sumRev = (txs: Transaction[]) => txs.reduce((s, t) => s + t.total, 0);

    const currTx = allTx.filter(t => inRange(t, currStart, currEnd) && methodMatch(t));
    const prevTx = allTx.filter(t => inRange(t, prevStart, prevEnd) && methodMatch(t));
    const currRev = sumRev(currTx);
    const prevRev = sumRev(prevTx);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const breakdown: ReportBreakdown[] = [];

    if (period === 'today') {
      for (let h = 0; h <= now.getHours(); h++) {
        const hStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0, 0);
        const hEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 59, 59, 999);
        const hTx    = allTx.filter(t => inRange(t, hStart, hEnd) && methodMatch(t));
        const label  = h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`;
        breakdown.push({ label, revenue: sumRev(hTx), count: hTx.length });
      }
    } else if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d  = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayTx = allTx.filter(t => t.created_at.startsWith(ds) && methodMatch(t));
        breakdown.push({ label: dayNames[d.getDay()], revenue: sumRev(dayTx), count: dayTx.length });
      }
    } else if (period === 'month') {
      for (let d = 1; d <= now.getDate(); d++) {
        const ds = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayTx = allTx.filter(t => t.created_at.startsWith(ds) && methodMatch(t));
        breakdown.push({ label: String(d), revenue: sumRev(dayTx), count: dayTx.length });
      }
    } else {
      const d = new Date(currStart);
      let cap = 0;
      while (d <= currEnd && cap++ < 90) {
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayTx = allTx.filter(t => t.created_at.startsWith(ds) && methodMatch(t));
        breakdown.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, revenue: sumRev(dayTx), count: dayTx.length });
        d.setDate(d.getDate() + 1);
      }
    }

    const svcMap: Record<string, { service_name: string; quantity: number; revenue: number }> = {};
    const prodMap: Record<string, { product_name: string; quantity: number; revenue: number }> = {};
    const productSales: Record<string, number> = {};
    for (const tx of currTx) {
      for (const item of tx.items ?? []) {
        const isProduct = item.item_type === 'product';
        if (isProduct) {
          if (!prodMap[item.service_name]) prodMap[item.service_name] = { product_name: item.service_name, quantity: 0, revenue: 0 };
          prodMap[item.service_name].quantity += item.quantity;
          prodMap[item.service_name].revenue += item.subtotal;
          productSales[item.service_name] = (productSales[item.service_name] ?? 0) + item.quantity;
        } else {
          if (!svcMap[item.service_name]) svcMap[item.service_name] = { service_name: item.service_name, quantity: 0, revenue: 0 };
          svcMap[item.service_name].quantity += item.quantity;
          svcMap[item.service_name].revenue += item.subtotal;
        }
      }
    }

    const dayCount = Math.max(1, Math.round((currEnd.getTime() - currStart.getTime()) / 86400000) + 1);
    const stockLevels = this.local.getProducts().map(p => {
      const sold = productSales[p.name] ?? 0;
      const avgDailySales = sold / dayCount;
      const daysRemaining = avgDailySales > 0 ? parseFloat((p.stock / avgDailySales).toFixed(1)) : null;
      const status: 'ok' | 'warning' | 'must-buy' | 'no-sales'
        = avgDailySales === 0 ? 'no-sales'
        : daysRemaining !== null && daysRemaining <= 1 ? 'must-buy'
        : daysRemaining !== null && daysRemaining <= 2 ? 'warning'
        : 'ok';
      return {
        product_name: p.name,
        stock: p.stock,
        price: p.price,
        cost: p.cost,
        avgDailySales,
        daysRemaining,
        status,
      };
    });

    // Payment breakdown always unfiltered (shows full split)
    const allCurrTx = allTx.filter(t => inRange(t, currStart, currEnd));
    const pmMap: Record<string, { method: string; revenue: number; count: number }> = {};
    for (const tx of allCurrTx) {
      if (!pmMap[tx.payment_method]) pmMap[tx.payment_method] = { method: tx.payment_method, revenue: 0, count: 0 };
      pmMap[tx.payment_method].revenue += tx.total;
      pmMap[tx.payment_method].count += 1;
    }

    return {
      current:  { revenue: currRev, count: currTx.length, avg: currTx.length ? currRev / currTx.length : 0 },
      previous: { revenue: prevRev, count: prevTx.length, avg: prevTx.length ? prevRev / prevTx.length : 0 },
      breakdown,
      topServices: Object.values(svcMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      topProducts: Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      stockLevels,
      paymentBreakdown: Object.values(pmMap).sort((a, b) => b.revenue - a.revenue),
    };
  }

  private async buildReportSQLite(
    period: 'today' | 'week' | 'month' | 'custom',
    paymentMethod = 'all',
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ReportStats> {
    const safeMethod = ['cash', 'card', 'gcash'].includes(paymentMethod) ? paymentMethod : null;
    const pmFilter  = safeMethod ? ` AND payment_method='${safeMethod}'`     : '';
    const pmFilterJ = safeMethod ? ` AND t.payment_method='${safeMethod}'`   : '';
    const today = new Date();

    let currWhere: string, prevWhere: string, topWhere: string, pmBaseWhere: string;

    if (period === 'today') {
      pmBaseWhere = `date(created_at) = date('now','localtime')`;
      currWhere   = pmBaseWhere + pmFilter;
      prevWhere   = `date(created_at) = date('now','localtime','-1 day')` + pmFilter;
      topWhere    = `date(t.created_at) = date('now','localtime')` + pmFilterJ;
    } else if (period === 'week') {
      pmBaseWhere = `date(created_at) >= date('now','localtime','-6 days')`;
      currWhere   = pmBaseWhere + pmFilter;
      prevWhere   = `date(created_at) BETWEEN date('now','localtime','-13 days') AND date('now','localtime','-7 days')` + pmFilter;
      topWhere    = `date(t.created_at) >= date('now','localtime','-6 days')` + pmFilterJ;
    } else if (period === 'month') {
      pmBaseWhere = `strftime('%Y-%m',created_at) = strftime('%Y-%m','now','localtime')`;
      currWhere   = pmBaseWhere + pmFilter;
      prevWhere   = `strftime('%Y-%m',created_at) = strftime('%Y-%m',date('now','localtime','start of month','-1 day'))` + pmFilter;
      topWhere    = `strftime('%Y-%m',t.created_at) = strftime('%Y-%m','now','localtime')` + pmFilterJ;
    } else {
      const from  = dateFrom ?? today.toISOString().substring(0, 10);
      const to    = dateTo   ?? today.toISOString().substring(0, 10);
      const diffs = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
      const pFrom = new Date(new Date(from).getTime() - (diffs + 1) * 86400000).toISOString().substring(0, 10);
      const pTo   = new Date(new Date(from).getTime() - 86400000).toISOString().substring(0, 10);
      pmBaseWhere = `date(created_at) BETWEEN '${from}' AND '${to}'`;
      currWhere   = pmBaseWhere + pmFilter;
      prevWhere   = `date(created_at) BETWEEN '${pFrom}' AND '${pTo}'` + pmFilter;
      topWhere    = `date(t.created_at) BETWEEN '${from}' AND '${to}'` + pmFilterJ;
    }

    const breakdownSQL = period === 'today'
      ? `SELECT strftime('%H',created_at) AS hr, COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count FROM transactions WHERE ${currWhere} GROUP BY hr ORDER BY hr`
      : period === 'month'
        ? `SELECT strftime('%d',created_at) AS day, COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count FROM transactions WHERE ${currWhere} GROUP BY day ORDER BY day`
        : `SELECT date(created_at) AS dt, COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count FROM transactions WHERE ${currWhere} GROUP BY dt ORDER BY dt`;

    const [currR, prevR, bR, topServicesR, topProductsR, stockR, pmR] = await Promise.all([
      this.sqliteStore!.query(`SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count, COALESCE(AVG(total),0) AS avg FROM transactions WHERE ${currWhere}`),
      this.sqliteStore!.query(`SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count, COALESCE(AVG(total),0) AS avg FROM transactions WHERE ${prevWhere}`),
      this.sqliteStore!.query(breakdownSQL),
      this.sqliteStore!.query(`SELECT ti.service_name, SUM(ti.quantity) AS quantity, SUM(ti.subtotal) AS revenue FROM transaction_items ti JOIN transactions t ON t.id=ti.transaction_id WHERE ${topWhere} AND ti.item_type='service' GROUP BY ti.service_name ORDER BY revenue DESC LIMIT 5`),
      this.sqliteStore!.query(`SELECT ti.service_name AS product_name, SUM(ti.quantity) AS quantity, SUM(ti.subtotal) AS revenue FROM transaction_items ti JOIN transactions t ON t.id=ti.transaction_id WHERE ${topWhere} AND ti.item_type='product' GROUP BY ti.service_name ORDER BY revenue DESC LIMIT 5`),
      this.sqliteStore!.query(`SELECT p.name AS product_name, p.stock, p.price, p.cost, COALESCE(SUM(ti.quantity),0) AS sold_quantity FROM products p LEFT JOIN transaction_items ti ON ti.service_name = p.name AND ti.item_type='product' LEFT JOIN transactions t ON t.id = ti.transaction_id AND ${topWhere} GROUP BY p.name ORDER BY p.stock ASC, p.name ASC`),
      this.sqliteStore!.query(`SELECT payment_method AS method, COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count FROM transactions WHERE ${pmBaseWhere} GROUP BY payment_method ORDER BY revenue DESC`),
    ]);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const breakdown: ReportBreakdown[] = [];

    if (period === 'today') {
      const hMap: Record<string, { revenue: number; count: number }> = {};
      for (const row of bR.values ?? []) hMap[row.hr] = { revenue: row.revenue, count: row.count };
      for (let h = 0; h <= today.getHours(); h++) {
        const key   = String(h).padStart(2, '0');
        const label = h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`;
        breakdown.push({ label, revenue: hMap[key]?.revenue ?? 0, count: hMap[key]?.count ?? 0 });
      }
    } else if (period === 'week') {
      const bMap: Record<string, { revenue: number; count: number }> = {};
      for (const row of bR.values ?? []) bMap[row.dt] = { revenue: row.revenue, count: row.count };
      for (let i = 6; i >= 0; i--) {
        const d  = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        breakdown.push({ label: dayNames[d.getDay()], revenue: bMap[ds]?.revenue ?? 0, count: bMap[ds]?.count ?? 0 });
      }
    } else if (period === 'month') {
      const bMap: Record<string, { revenue: number; count: number }> = {};
      for (const row of bR.values ?? []) bMap[row.day] = { revenue: row.revenue, count: row.count };
      for (let d = 1; d <= today.getDate(); d++) {
        const key = String(d).padStart(2, '0');
        breakdown.push({ label: String(d), revenue: bMap[key]?.revenue ?? 0, count: bMap[key]?.count ?? 0 });
      }
    } else {
      const bMap: Record<string, { revenue: number; count: number }> = {};
      for (const row of bR.values ?? []) bMap[row.dt] = { revenue: row.revenue, count: row.count };
      const from = dateFrom ?? today.toISOString().substring(0, 10);
      const to   = dateTo   ?? today.toISOString().substring(0, 10);
      const d    = new Date(from + 'T00:00:00');
      const end  = new Date(to   + 'T00:00:00');
      let cap = 0;
      while (d <= end && cap++ < 90) {
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        breakdown.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, revenue: bMap[ds]?.revenue ?? 0, count: bMap[ds]?.count ?? 0 });
        d.setDate(d.getDate() + 1);
      }
    }

    const curr = currR.values?.[0] ?? { revenue: 0, count: 0, avg: 0 };
    const prev = prevR.values?.[0] ?? { revenue: 0, count: 0, avg: 0 };
    const productRows = (stockR.values ?? []) as Array<{ product_name: string; stock: number; price: number; cost: number; sold_quantity: number }>;
    const dayCount = this.calculateDayCount(period, dateFrom, dateTo);
    const stockLevels = productRows.map(row => {
      const sold = row.sold_quantity ?? 0;
      const avgDailySales = sold / dayCount;
      const daysRemaining = avgDailySales > 0 ? parseFloat((row.stock / avgDailySales).toFixed(1)) : null;
      const status: 'ok' | 'warning' | 'must-buy' | 'no-sales'
        = avgDailySales === 0 ? 'no-sales'
        : daysRemaining !== null && daysRemaining <= 1 ? 'must-buy'
        : daysRemaining !== null && daysRemaining <= 2 ? 'warning'
        : 'ok';
      return {
        product_name: row.product_name,
        stock: row.stock,
        price: row.price,
        cost: row.cost,
        avgDailySales,
        daysRemaining,
        status,
      };
    });
    return {
      current:  { revenue: curr.revenue, count: curr.count, avg: curr.avg },
      previous: { revenue: prev.revenue, count: prev.count, avg: prev.avg },
      breakdown,
      topServices: (topServicesR.values ?? []) as any,
      topProducts: (topProductsR.values ?? []) as any,
      stockLevels,
      paymentBreakdown: (pmR.values ?? []) as any,
    };
  }

  getTopRepeatCustomers(
    limit: number,
    period: 'today' | 'week' | 'month' | 'year' | 'custom' = 'week',
    dateFrom?: string,
    dateTo?: string,
  ): Observable<RepeatCustomer[]> {
    return from(this.ready.then(async () => {
      if (!this.isNative) return this.buildRepeatCustomersLocal(limit, period, dateFrom, dateTo);
      return this.buildRepeatCustomersSQLite(limit, period, dateFrom, dateTo);
    }));
  }

  private buildRepeatCustomersLocal(
    limit: number,
    period: 'today' | 'week' | 'month' | 'year' | 'custom',
    dateFrom?: string,
    dateTo?: string,
  ): RepeatCustomer[] {
    const allTx = this.local.getTransactions();
    const now = new Date();
    let start: Date, end: Date;

    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'week') {
      end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else {
      start = dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end   = dateTo   ? new Date(dateTo   + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    const map: Record<string, { customer_name: string; visit_count: number; total_spent: number; last_visit: string }> = {};
    for (const tx of allTx) {
      if (!tx.phone_number) continue;
      const d = new Date(tx.created_at.replace(' ', 'T'));
      if (d < start || d > end) continue;
      if (!map[tx.phone_number]) {
        map[tx.phone_number] = { customer_name: tx.customer_name ?? '', visit_count: 0, total_spent: 0, last_visit: tx.created_at };
      }
      map[tx.phone_number].visit_count += 1;
      map[tx.phone_number].total_spent += tx.total;
      if (tx.created_at > map[tx.phone_number].last_visit) {
        map[tx.phone_number].last_visit = tx.created_at;
        if (tx.customer_name) map[tx.phone_number].customer_name = tx.customer_name;
      }
    }

    return Object.entries(map)
      .map(([phone_number, v]) => ({ phone_number, ...v }))
      .sort((a, b) => b.visit_count - a.visit_count || b.total_spent - a.total_spent)
      .slice(0, limit);
  }

  private async buildRepeatCustomersSQLite(
    limit: number,
    period: 'today' | 'week' | 'month' | 'year' | 'custom',
    dateFrom?: string,
    dateTo?: string,
  ): Promise<RepeatCustomer[]> {
    const today = new Date();
    let where: string;

    if (period === 'today') {
      where = `date(created_at) = date('now','localtime')`;
    } else if (period === 'week') {
      where = `date(created_at) >= date('now','localtime','-6 days')`;
    } else if (period === 'month') {
      where = `strftime('%Y-%m',created_at) = strftime('%Y-%m','now','localtime')`;
    } else if (period === 'year') {
      where = `strftime('%Y',created_at) = strftime('%Y','now','localtime')`;
    } else {
      const from = dateFrom ?? today.toISOString().substring(0, 10);
      const to   = dateTo   ?? today.toISOString().substring(0, 10);
      where = `date(created_at) BETWEEN '${from}' AND '${to}'`;
    }

    const r = await this.sqliteStore!.query(
      `SELECT phone_number,
              (SELECT customer_name FROM transactions t2
               WHERE t2.phone_number = t1.phone_number AND t2.customer_name != ''
               ORDER BY t2.created_at DESC LIMIT 1) AS customer_name,
              COUNT(*) AS visit_count, SUM(total) AS total_spent, MAX(created_at) AS last_visit
       FROM transactions t1
       WHERE phone_number != '' AND ${where}
       GROUP BY phone_number
       ORDER BY visit_count DESC, total_spent DESC
       LIMIT ?`,
      [limit],
    );
    return (r.values ?? []).map((row: any) => ({ ...row, customer_name: row.customer_name ?? '' })) as RepeatCustomer[];
  }

  // ── Loyalty Tracking ──────────────────────────────────────────────────────

  getLoyaltyTracking(): Observable<LoyaltyEntry[]> {
    return from(this.ready.then(async () => {
      if (!this.isNative) {
        const allTx = this.local.getTransactions();
        const redemptions = this.local.getLoyaltyRedemptions();
        const lastRedeemed: Record<string, string> = {};
        for (const r of redemptions) {
          if (!lastRedeemed[r.phone_number] || r.redeemed_at > lastRedeemed[r.phone_number]) {
            lastRedeemed[r.phone_number] = r.redeemed_at;
          }
        }
        // Build set of service IDs tagged for loyalty tracking
        const loyaltyServiceIds = new Set(
          this.local.getServices()
            .filter(s => (s.loyalty_tracking ?? 1) === 1)
            .map(s => s.id)
        );
        const map: Record<string, { customer_name: string; visit_count: number; total_spent: number; last_visit: string }> = {};
        for (const tx of allTx) {
          if (!tx.phone_number) continue;
          const cutoff = lastRedeemed[tx.phone_number];
          if (cutoff && tx.created_at <= cutoff) continue;
          // Sum quantities of each loyalty-tracked service item
          const loyaltyItemCount = (tx.items ?? []).filter(
            item => item.item_type !== 'product' && loyaltyServiceIds.has(item.service_id)
          ).reduce((sum, item) => sum + item.quantity, 0);
          if (loyaltyItemCount === 0) continue;
          if (!map[tx.phone_number]) {
            map[tx.phone_number] = { customer_name: tx.customer_name ?? '', visit_count: 0, total_spent: 0, last_visit: tx.created_at };
          }
          map[tx.phone_number].visit_count += loyaltyItemCount;
          map[tx.phone_number].total_spent += tx.total;
          if (tx.created_at > map[tx.phone_number].last_visit) {
            map[tx.phone_number].last_visit = tx.created_at;
            if (tx.customer_name) map[tx.phone_number].customer_name = tx.customer_name;
          }
        }
        return Object.entries(map)
          .map(([phone_number, v]) => ({ phone_number, ...v }))
          .sort((a, b) => b.visit_count - a.visit_count || b.total_spent - a.total_spent);
      }
      const r = await this.sqliteStore!.query(`
        SELECT
          t.phone_number,
          COALESCE(
            (SELECT customer_name FROM transactions
             WHERE phone_number = t.phone_number AND customer_name != ''
             ORDER BY created_at DESC LIMIT 1), ''
          ) AS customer_name,
          SUM((
            SELECT SUM(ti2.quantity) FROM transaction_items ti2
            JOIN services s2 ON s2.id = ti2.service_id
            WHERE ti2.transaction_id = t.id
              AND ti2.item_type = 'service'
              AND s2.loyalty_tracking = 1
          )) AS visit_count,
          SUM(t.total) AS total_spent,
          MAX(t.created_at) AS last_visit
        FROM transactions t
        LEFT JOIN (
          SELECT phone_number, MAX(redeemed_at) AS last_redeemed
          FROM loyalty_redemptions
          GROUP BY phone_number
        ) lr ON lr.phone_number = t.phone_number
        WHERE t.phone_number != ''
          AND (lr.last_redeemed IS NULL OR t.created_at > lr.last_redeemed)
          AND EXISTS (
            SELECT 1 FROM transaction_items ti
            JOIN services s ON s.id = ti.service_id
            WHERE ti.transaction_id = t.id
              AND ti.item_type = 'service'
              AND s.loyalty_tracking = 1
          )
        GROUP BY t.phone_number
        ORDER BY visit_count DESC, total_spent DESC
      `);
      return (r.values ?? []) as LoyaltyEntry[];
    }));
  }

  redeemLoyalty(phone_number: string, customer_name: string): Observable<void> {
    return from(this.ready.then(async () => {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      if (!this.isNative) {
        const redemptions = this.local.getLoyaltyRedemptions();
        redemptions.push({ phone_number, customer_name, redeemed_at: now });
        this.local.saveLoyaltyRedemptions(redemptions);
        return;
      }
      await this.sqliteStore!.run(
        'INSERT INTO loyalty_redemptions (phone_number, customer_name, redeemed_at) VALUES (?,?,?)',
        [phone_number, customer_name, now]
      );
    }));
  }
}
