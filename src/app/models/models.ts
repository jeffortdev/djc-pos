export interface LaundryService {
  id: number;
  name: string;
  price: number;
  category: string;
  unit: string;
  active: number;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  type: string;
  cost: number;
  price: number;
  stock: number;
  active: number;
  sort_order: number;
}

export interface CartItem {
  service_id: number;
  service_name: string;
  unit: string;
  price: number;
  quantity: number;
  item_type: 'service' | 'product';
}

export interface TransactionItem {
  id: number;
  transaction_id: number;
  service_id: number;
  service_name: string;
  unit: string;
  price: number;
  quantity: number;
  subtotal: number;
  item_type: 'service' | 'product';
}

export interface Transaction {
  id: number;
  created_at: string;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string;
  amount_tendered: number;
  change_due: number;
  phone_number?: string;
  notes: string;
  notify_count?: number;
  items?: TransactionItem[];
}

export interface StockEntry {
  id: number;
  product_id: number;
  product_name?: string;
  delta: number;
  reason: string;
  note: string;
  stock_after: number;
  created_at: string;
}

export interface DatabaseBackup {
  version: number;
  services: LaundryService[];
  products: Product[];
  transactions: Transaction[];
  registerEntries: { id: number; amount: number; note: string; created_at: string }[];
  settings: { key: string; value: string }[];
  stockHistory?: StockEntry[];
}

export interface DashboardStats {
  transaction_count: number;
  revenue: number;
  avg_ticket: number;
  register_balance: number;
  topServices: { service_name: string; quantity: number; revenue: number }[];
  recentTransactions: Transaction[];
}

export interface ReportPeriodData {
  revenue: number;
  count: number;
  avg: number;
}

export interface ReportBreakdown {
  label: string;
  revenue: number;
  count: number;
}

export interface RepeatCustomer {
  phone_number: string;
  visit_count: number;
  total_spent: number;
  last_visit: string;
}

export interface ReportStats {
  current: ReportPeriodData;
  previous: ReportPeriodData;
  breakdown: ReportBreakdown[];
  topServices: { service_name: string; quantity: number; revenue: number }[];
  topProducts: { product_name: string; quantity: number; revenue: number }[];
  stockLevels: {
    product_name: string;
    stock: number;
    price: number;
    cost: number;
    avgDailySales: number;
    daysRemaining: number | null;
    status: 'ok' | 'warning' | 'must-buy' | 'no-sales';
  }[];
  paymentBreakdown: { method: string; revenue: number; count: number }[];
}
