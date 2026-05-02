import express from 'express';
import cors from 'cors';
import './database.js';
import { servicesRouter } from './routes/services.js';
import { transactionsRouter } from './routes/transactions.js';
import { dashboardRouter } from './routes/dashboard.js';

const app = express();
const PORT = 3000;

app.use(cors({ origin: ['http://localhost:4200', 'http://127.0.0.1:4200', 'http://localhost:8100', 'http://127.0.0.1:8100', 'capacitor://localhost', 'ionic://localhost', null] }));
app.use(express.json());

app.use('/api/services', servicesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/dashboard', dashboardRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🧺 Laundromat POS API running at http://127.0.0.1:${PORT}`);
});
