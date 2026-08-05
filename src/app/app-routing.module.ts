import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { adminPinGuard } from './guards/admin-pin.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tabs/tabs.component').then(m => m.TabsComponent),
    children: [
      {
        path: 'pos',
        loadComponent: () => import('./pages/pos/pos.page').then(m => m.PosPage),
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
      },
      {
        path: 'transactions',
        loadComponent: () => import('./pages/transactions/transactions.page').then(m => m.TransactionsPage),
      },
      {
        path: 'services',
        canActivate: [adminPinGuard],
        loadComponent: () => import('./pages/services-admin/services-admin.page').then(m => m.ServicesAdminPage),
      },
      {
        path: 'products',
        canActivate: [adminPinGuard],
        loadComponent: () => import('./pages/products-admin/products-admin.page').then(m => m.ProductsAdminPage),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
      },
      {
        path: 'reports',
        canActivate: [adminPinGuard],
        loadComponent: () => import('./pages/reports/reports.page').then(m => m.ReportsPage),
      },
      {
        path: 'customers',
        canActivate: [adminPinGuard],
        loadComponent: () => import('./pages/customers-admin/customers-admin.page').then(m => m.CustomersAdminPage),
      },
      { path: '', redirectTo: 'pos', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
