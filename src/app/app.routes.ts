import { Routes } from '@angular/router';
import { adminGuard, guestGuard } from './core/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () => import('./pages/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'products',
        title: 'Products',
        loadComponent: () => import('./pages/products').then((m) => m.Products),
      },
      {
        path: 'products/new',
        title: 'New product',
        loadComponent: () => import('./pages/product-form').then((m) => m.ProductForm),
      },
      {
        path: 'products/:id',
        title: 'Edit product',
        loadComponent: () => import('./pages/product-form').then((m) => m.ProductForm),
      },
      {
        path: 'categories',
        title: 'Categories',
        loadComponent: () => import('./pages/categories').then((m) => m.Categories),
      },
      {
        path: 'orders',
        title: 'Orders',
        loadComponent: () => import('./pages/orders').then((m) => m.Orders),
      },
      {
        path: 'orders/:id',
        title: 'Order',
        loadComponent: () => import('./pages/order-detail').then((m) => m.OrderDetail),
      },
      {
        path: 'customers',
        title: 'Customers',
        loadComponent: () => import('./pages/customers').then((m) => m.Customers),
      },
      {
        path: 'customers/:id',
        title: 'Customer',
        loadComponent: () => import('./pages/customer-detail').then((m) => m.CustomerDetail),
      },
      {
        path: 'messages',
        title: 'Messages',
        loadComponent: () => import('./pages/messages').then((m) => m.Messages),
      },
      {
        path: 'messages/:uid',
        title: 'Messages',
        loadComponent: () => import('./pages/messages').then((m) => m.Messages),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
