import { Router } from 'express';
import { db } from '../database.js';

export const transactionsRouter = Router();

transactionsRouter.get('/', (req, res) => {
  const limit = parseInt(req.query['limit'] as string) || 50;
  const offset = parseInt(req.query['offset'] as string) || 0;
  const rows = db.prepare(
    'SELECT * FROM transactions ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset);
  res.json(rows);
});

transactionsRouter.get('/:id', (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions WHERE id=?').get(req.params['id']);
  if (!tx) return res.status(404).json({ error: 'Not found' });
  const items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id=?').all(req.params['id']);
  res.json({ ...tx as object, items });
});

transactionsRouter.post('/', (req, res) => {
  const { items, payment_method, amount_tendered, notes, phone_number } = req.body;
  if (!items?.length) return res.status(400).json({ error: 'items required' });

  const subtotal: number = items.reduce((s: number, i: { price: number; quantity: number }) => s + i.price * i.quantity, 0);
  const tax = parseFloat((subtotal * 0.0).toFixed(2)); // configurable - no tax for now
  const total = parseFloat((subtotal + tax).toFixed(2));
  const change_due = Math.max(0, parseFloat(((amount_tendered ?? total) - total).toFixed(2)));

  const saveTx = db.transaction(() => {
    const txResult = db.prepare(
      `INSERT INTO transactions (subtotal, tax, total, payment_method, amount_tendered, change_due, phone_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(subtotal, tax, total, payment_method ?? 'cash', amount_tendered ?? total, change_due, phone_number ?? '', notes ?? '');

    const txId = txResult.lastInsertRowid;
    const insertItem = db.prepare(
      `INSERT INTO transaction_items (transaction_id, service_id, service_name, unit, price, quantity, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const item of items) {
      insertItem.run(txId, item.service_id, item.service_name, item.unit, item.price, item.quantity, item.price * item.quantity);
    }
    return txId;
  });

  const id = saveTx();
  const tx = db.prepare('SELECT * FROM transactions WHERE id=?').get(id);
  const txItems = db.prepare('SELECT * FROM transaction_items WHERE transaction_id=?').all(id);
  res.status(201).json({ ...tx as object, items: txItems });
});

transactionsRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id=?').run(req.params['id']);
  res.json({ ok: true });
});
