import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../core/data.service';
import { Order } from '../core/models';
import { FullNamePipe, StatusLabelPipe } from '../shared/pipes';

@Component({
  selector: 'app-customer-detail',
  imports: [RouterLink, CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, FullNamePipe, StatusLabelPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="title">
          <a mat-icon-button routerLink="/customers" aria-label="Back to customers"><mat-icon>arrow_back</mat-icon></a>
          <h1>{{ customer() | fullName }}</h1>
        </div>
        <a mat-stroked-button [routerLink]="['/messages', id()]"><mat-icon>forum</mat-icon> Message</a>
      </div>

      <div class="layout">
        <section class="panel panel-pad profile">
          @if (customer()?.image || customer()?.thumb_image) {
            <img [src]="customer()?.image || customer()?.thumb_image" alt="" />
          }
          <dl>
            <dt>Email</dt><dd>{{ customer()?.email || '—' }}</dd>
            <dt>Phone</dt><dd>{{ customer()?.phoneNumber || '—' }}</dd>
            <dt>Address</dt><dd>{{ customer()?.address || '—' }}</dd>
            <dt>Orders</dt><dd>{{ orders().length }}</dd>
            <dt>Total spent</dt><dd>{{ spent() | currency: 'USD' }}</dd>
          </dl>
        </section>

        <section class="panel">
          <h2>Orders</h2>
          @for (o of orders(); track o.id) {
            <a class="row" [routerLink]="['/orders', o.id]">
              <div>
                <div class="strong">#{{ o.id.slice(0, 8) }}</div>
                <div class="muted small">{{ o.placed_at | date: 'd MMM y' }}</div>
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
      </div>
    </div>
  `,
  styles: `
    .title { display: flex; align-items: center; gap: 8px; }
    .layout { display: grid; grid-template-columns: 320px 1fr; gap: 16px; align-items: start; }
    .profile img { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; margin-bottom: 16px; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; margin: 0; }
    dt { color: var(--sc-muted); }
    dd { margin: 0; word-break: break-word; }
    h2 { font-size: 16px; margin: 0; padding: 20px 20px 12px; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-top: 1px solid var(--sc-border); text-decoration: none; color: inherit; }
    .row:hover { background: color-mix(in srgb, var(--mat-sys-primary) 5%, transparent); }
    .end { display: flex; gap: 12px; align-items: center; }
    .strong { font-weight: 600; }
    .small { font-size: 12px; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class CustomerDetail {
  private data = inject(DataService);
  readonly id = input.required<string>();

  protected customer = toSignal(toObservable(this.id).pipe(switchMap((id) => this.data.customer$(id))));
  protected orders = toSignal(
    toObservable(this.id).pipe(switchMap((id) => this.data.customerOrders$(id))),
    { initialValue: [] as Order[] },
  );
  protected spent = computed(() =>
    this.orders()
      .filter((o) => ['new', 'shipped', 'delivered'].includes(o.status))
      .reduce((t, o) => t + (o.amount ?? 0), 0),
  );
}
