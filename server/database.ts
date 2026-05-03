import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'djcpos.db');

import fs from 'fs';
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    price     REAL    NOT NULL,
    category  TEXT    NOT NULL DEFAULT 'standard',
    unit      TEXT    NOT NULL DEFAULT 'per item',
    active    INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    subtotal       REAL    NOT NULL,
    tax            REAL    NOT NULL DEFAULT 0,
    total          REAL    NOT NULL,
    payment_method TEXT    NOT NULL DEFAULT 'cash',
    amount_tendered REAL   NOT NULL DEFAULT 0,
    change_due     REAL    NOT NULL DEFAULT 0,
    phone_number   TEXT    NOT NULL DEFAULT '',
    notify_count   INTEGER NOT NULL DEFAULT 0,
    notes          TEXT    NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS transaction_items (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    service_id     INTEGER NOT NULL,
    service_name   TEXT    NOT NULL,
    unit           TEXT    NOT NULL,
    price          REAL    NOT NULL,
    quantity       INTEGER NOT NULL DEFAULT 1,
    subtotal       REAL    NOT NULL
  );
`);

// Migrate: add phone_number column if missing (for existing databases)
const txCols = db.prepare("PRAGMA table_info(transactions)").all() as { name: string }[];
if (!txCols.find(c => c.name === 'phone_number')) {
  db.exec("ALTER TABLE transactions ADD COLUMN phone_number TEXT NOT NULL DEFAULT ''");
}
if (!txCols.find(c => c.name === 'notify_count')) {
  db.exec('ALTER TABLE transactions ADD COLUMN notify_count INTEGER NOT NULL DEFAULT 0');
}

// Seed default services if table is empty
const count = (db.prepare('SELECT COUNT(*) as c FROM services').get() as { c: number }).c;
if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO services (name, price, category, unit, sort_order)
    VALUES (@name, @price, @category, @unit, @sort_order)
  `);
  const seedMany = db.transaction((rows: object[]) => rows.forEach(r => insert.run(r)));
  seedMany([
    { name: 'Wash & Fold',     price: 2.50,  category: 'wash',     unit: 'per kg',    sort_order: 1 },
    { name: 'Wash Only',       price: 5.00,  category: 'wash',     unit: 'per load',  sort_order: 2 },
    { name: 'Dry Only',        price: 4.00,  category: 'dry',      unit: 'per load',  sort_order: 3 },
    { name: 'Wash & Dry',      price: 8.00,  category: 'wash',     unit: 'per load',  sort_order: 4 },
    { name: 'Press / Iron',    price: 3.00,  category: 'press',    unit: 'per piece', sort_order: 5 },
    { name: 'Dry Cleaning',    price: 12.00, category: 'dry-clean',unit: 'per piece', sort_order: 6 },
    { name: 'Comforter Wash',  price: 15.00, category: 'special',  unit: 'per item',  sort_order: 7 },
    { name: 'Pillow Wash',     price: 8.00,  category: 'special',  unit: 'per item',  sort_order: 8 },
    { name: 'Shoe Wash',       price: 10.00, category: 'special',  unit: 'per pair',  sort_order: 9 },
    { name: 'Curtain Wash',    price: 18.00, category: 'special',  unit: 'per set',   sort_order: 10 },
  ]);
}
