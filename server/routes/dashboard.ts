import { Router } from 'express';
import { db } from '../database.js';

export const dashboardRouter = Router();

dashboardRouter.get('/today', (_req, res) => {
  const today = db.prepare(`
    SELECT
      COUNT(*) as transaction_count,
      COALESCE(SUM(total), 0) as revenue,
      COALESCE(AVG(total), 0) as avg_ticket
    FROM transactions
    WHERE date(created_at) = date('now','localtime')
  `).get();

  const topServices = db.prepare(`
    SELECT ti.service_name, SUM(ti.quantity) as quantity, SUM(ti.subtotal) as revenue
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    WHERE date(t.created_at) = date('now','localtime')
    GROUP BY ti.service_name
    ORDER BY revenue DESC
    LIMIT 5
  `).all();

  const recentTx = db.prepare(`
    SELECT * FROM transactions
    WHERE date(created_at) = date('now','localtime')
    ORDER BY created_at DESC
    LIMIT 5
  `).all();

  res.json({ ...today as object, topServices, recentTransactions: recentTx });
});
