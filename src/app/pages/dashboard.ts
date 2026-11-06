import { Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { where } from '@angular/fire/firestore';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../core/data.service';
import { MillisPipe, StatusLabelPipe } from '../shared/pipes';

interface Stat {
  label: string;
  value: number | null;
  icon: string;
  money?: boolean;
  link?: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    MatIconModule,
    MatButtonModule,
    MillisPipe,
    StatusLabelPipe,
  ],
  template: `
    <div class="page">
      <div class="page-header"><h1>Dashboard</h1></div>

      <section class="stats">
        @for (s of stats(); track s.label) {
          <a class="stat panel" [routerLink]="s.link">
            <mat-icon>{{ s.icon }}</mat-icon>
            <div>
              <div class="value">
                @if (s.value === null) {
                  –
                } @else if (s.money) {
                  {{ s.value | currency: 'USD' }}
                } @else {
                  {{ s.value | number }}
                }
              </div>
              <div class="label muted">{{ s.label }}</div>
            </div>
          </a>
        }
      </section>

      <div class="grid">
        <section class="panel">
          <header>
            <h2>Recent orders</h2>
            <a mat-button routerLink="/orders">View all</a>
          </header>
          @for (o of recentOrders(); track o.id) {
            <a class="row" [routerLink]="['/orders', o.id]">
              <div>
                <div class="strong">{{ o.user_name || 'Customer' }}</div>
                <div class="muted small">{{ o.placed_at | date: 'd MMM, HH:mm' }}</div>
              </div>
              <div class="end">
                <span class="status-chip" [class]="o.status">{{ o.status | statusLabel }}</span>
                <span class="strong">{{ (o.amount ?? 0) | currency: 'USD' }}</span>
              </div>
            </a>
          } @empty {
            <div class="empty">No orders yet.</div>
          }
        </section>

        <section class="panel">
          <header>
            <h2>Low stock</h2>
            <a mat-button routerLink="/products">Products</a>
          </header>
          @for (p of lowStock(); track p.id) {
            <a class="row" [routerLink]="['/products', p.id]">
              <div class="with-thumb">
                <img class="thumb" [src]="p.product_thumb_image || p.product_image || 'favicon.svg'" alt="" />
                <span class="strong">{{ p.product_name }}</span>
              </div>
              <span class="qty" [class.out]="p.product_quantity <= 0">{{ p.product_quantity }} left</span>
            </a>
          } @empty {
            <div class="empty">Everything is well stocked.</div>
          }
        </section>

        <section class="panel wide">
          <header><h2>Latest reviews</h2></header>
          @for (r of reviews(); track r.id) {
            <div class="row review">
              <div>
                <div class="strong">
                  {{ r.user_name || 'Customer' }}
                  <span class="muted small">on {{ r.prodName || 'a product' }}</span>
                </div>
                <div class="text">{{ r.review }}</div>
              </div>
              <div class="end">
                <span class="stars" [attr.aria-label]="r.rating + ' out of 5'">
                  {{ '★★★★★'.slice(0, r.rating) }}<span class="dim">{{ '★★★★★'.slice(r.rating) }}</span>
                </span>
                <span class="muted small">{{ r.time | millis | date: 'd MMM' }}</span>
              </div>
            </div>
          } @empty {
            <div class="empty">No reviews yet.</div>
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat { display: flex; gap: 14px; align-items: center; padding: 18px; text-decoration: none; color: inherit; }
    .stat mat-icon { color: var(--mat-sys-primary); background: var(--mat-sys-primary-container); border-radius: 10px; padding: 10px; box-sizing: content-box; }
    .value { font-size: 22px; font-weight: 700; }
    .label { font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .wide { grid-column: 1 / -1; }
    header { display: flex; justify-content: space-between; align-items: center; padding: 12px 12px 4px 20px; }
    h2 { margin: 0; font-size: 16px; font-weight: 600; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 20px; border-top: 1px solid var(--sc-border); text-decoration: none; color: inherit; }
    a.row:hover { background: color-mix(in srgb, var(--mat-sys-primary) 5%, transparent); }
    .end { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .strong { font-weight: 600; }
    .small { font-size: 12px; font-weight: 400; }
    .with-thumb { display: flex; align-items: center; gap: 12px; }
    .qty { font-weight: 600; color: var(--sc-warn); }
    .qty.out { color: var(--sc-danger); }
    .review .text { margin-top: 4px; }
    .stars { color: #e3a008; letter-spacing: 1px; }
    .dim { opacity: 0.25; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class Dashboard implements OnInit {
  private data = inject(DataService);

  protected stats = signal<Stat[]>([
    { label: 'Revenue', value: null, icon: 'payments', money: true, link: '/orders' },
    { label: 'Orders to fulfil', value: null, icon: 'local_shipping', link: '/orders' },
    { label: 'Products', value: null, icon: 'inventory_2', link: '/products' },
    { label: 'Customers', value: null, icon: 'group', link: '/customers' },
  ]);

  protected recentOrders = toSignal(this.data.recentOrders$(), { initialValue: [] });
  protected lowStock = toSignal(this.data.lowStock$(), { initialValue: [] });
  protected reviews = toSignal(this.data.latestReviews$(), { initialValue: [] });

  async ngOnInit() {
    const [revenue, toFulfil, products, customers] = await Promise.all([
      this.data.revenue().catch(() => null),
      this.data.count('orders', where('status', '==', 'new')).catch(() => null),
      this.data.count('products').catch(() => null),
      this.data.count('users').catch(() => null),
    ]);
    const values = [revenue, toFulfil, products, customers];
    this.stats.update((list) => list.map((s, i) => ({ ...s, value: values[i] })));
  }
}
