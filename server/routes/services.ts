import { Router } from 'express';
import { db } from '../database.js';

export const servicesRouter = Router();

servicesRouter.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM services ORDER BY sort_order, name').all();
  res.json(rows);
});

servicesRouter.get('/active', (_req, res) => {
  const rows = db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY sort_order, name').all();
  res.json(rows);
});

servicesRouter.post('/', (req, res) => {
  const { name, price, category, unit, sort_order } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'name and price required' });
  const result = db.prepare(
    'INSERT INTO services (name, price, category, unit, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(name, price, category ?? 'standard', unit ?? 'per item', sort_order ?? 0);
  res.status(201).json({ id: result.lastInsertRowid });
});

servicesRouter.put('/:id', (req, res) => {
  const { name, price, category, unit, sort_order, active } = req.body;
  db.prepare(
    'UPDATE services SET name=?, price=?, category=?, unit=?, sort_order=?, active=? WHERE id=?'
  ).run(name, price, category, unit, sort_order, active, req.params['id']);
  res.json({ ok: true });
});

servicesRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM services WHERE id=?').run(req.params['id']);
  res.json({ ok: true });
});
