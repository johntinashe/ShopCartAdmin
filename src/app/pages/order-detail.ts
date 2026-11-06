import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataService } from '../core/data.service';
import { OrderItem, OrderStatus } from '../core/models';
import { FullNamePipe, StatusLabelPipe } from '../shared/pipes';

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, StatusLabelPipe, FullNamePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="title">
          <a mat-icon-button routerLink="/orders" aria-label="Back to orders"><mat-icon>arrow_back</mat-icon></a>
          <h1>Order #{{ id().slice(0, 8) }}</h1>
          @if (order(); as o) {
            <span class="status-chip" [class]="o.status">{{ o.status | statusLabel }}</span>
          }
        </div>
        @if (order(); as o) {
          <div class="actions">
            @if (o.status === 'new') {
              <button mat-button class="danger" (click)="setStatus('cancelled')" [disabled]="busy()">Cancel order</button>
              <button mat-flat-button (click)="setStatus('shipped')" [disabled]="busy()">
                <mat-icon>local_shipping</mat-icon> Mark shipped
              </button>
            }
            @if (o.status === 'shipped') {
              <button mat-flat-button (click)="setStatus('delivered')" [disabled]="busy()">
                <mat-icon>task_alt</mat-icon> Mark delivered
              </button>
            }
          </div>
        }
      </div>

      @if (order(); as o) {
        <div class="layout">
          <section class="panel">
            <h2>Items</h2>
            @for (item of items(); track item.product_id) {
              <div class="item">
                <img class="thumb" [src]="item.product_thumb_image || 'favicon.svg'" alt="" />
                <div class="grow">
                  <div class="strong">{{ item.product_name }}</div>
                  <div class="muted small">{{ item.number }} × {{ item.product_price | currency: 'USD' }}</div>
                </div>
                <div class="strong">{{ item.total_price | currency: 'USD' }}</div>
              </div>
            } @empty {
              <div class="empty">No item details recorded.</div>
            }
            <div class="total">
              <span>Total</span>
              <span>{{ (o.amount ?? itemsTotal()) | currency: 'USD' }}</span>
            </div>
          </section>

          <aside class="side">
            <section class="panel panel-pad">
              <h2>Customer</h2>
              @if (customer(); as c) {
                <a class="strong link" [routerLink]="['/customers', o.user_id]">{{ c | fullName }}</a>
                @if (c.email) { <div class="muted">{{ c.email }}</div> }
                @if (c.phoneNumber) { <div class="muted">{{ c.phoneNumber }}</div> }
              } @else {
                <div>{{ o.user_name || 'Customer' }}</div>
              }
              <h3>Deliver to</h3>
              <div>{{ o.delivery_address || customer()?.address || 'No address given' }}</div>
              @if (customer()?.id) {
                <a mat-stroked-button class="msg" [routerLink]="['/messages', o.user_id]">
                  <mat-icon>forum</mat-icon> Message customer
                </a>
              }
            </section>

            <section class="panel panel-pad">
              <h2>Payment</h2>
              <dl>
                <dt>Method</dt><dd class="capitalize">{{ o.payment?.method || 'Card (2018 app)' }}</dd>
                <dt>Provider</dt><dd class="capitalize">{{ o.payment?.provider || 'stripe' }}</dd>
                @if (o.payment?.status) { <dt>Gateway status</dt><dd>{{ o.payment?.status }}</dd> }
                @if (o.payment?.paynow_reference) { <dt>Paynow ref</dt><dd>{{ o.payment?.paynow_reference }}</dd> }
              </dl>
            </section>

            <section class="panel panel-pad">
              <h2>Timeline</h2>
              <ol class="timeline">
                <li>Placed <span class="muted">{{ o.placed_at | date: 'd MMM y, HH:mm' }}</span></li>
                @if (o.paid_at) { <li>Paid <span class="muted">{{ o.paid_at | date: 'd MMM y, HH:mm' }}</span></li> }
                @if (o.shipped_at) { <li>Shipped <span class="muted">{{ o.shipped_at | date: 'd MMM y, HH:mm' }}</span></li> }
                @if (o.delivered_at) { <li>Delivered <span class="muted">{{ o.delivered_at | date: 'd MMM y, HH:mm' }}</span></li> }
                @if (o.cancelled_at) { <li>Cancelled <span class="muted">{{ o.cancelled_at | date: 'd MMM y, HH:mm' }}</span></li> }
              </ol>
            </section>
          </aside>
        </div>
      } @else {
        <div class="empty">Loading order…</div>
      }
    </div>
  `,
  styles: `
    .title, .actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .danger { color: var(--sc-danger); }
    .layout { display: grid; grid-template-columns: 1fr 340px; gap: 16px; align-items: start; }
    .side { display: flex; flex-direction: column; gap: 16px; }
    h2 { font-size: 16px; margin: 0 0 12px; }
    section.panel > h2 { padding: 20px 20px 0; }
    .panel-pad > h2 { padding: 0; }
    h3 { font-size: 13px; margin: 16px 0 4px; color: var(--sc-muted); font-weight: 600; }
    .item { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-top: 1px solid var(--sc-border); }
    .grow { flex: 1; }
    .strong { font-weight: 600; }
    .small { font-size: 12px; }
    .link { color: var(--mat-sys-primary); text-decoration: none; }
    .total { display: flex; justify-content: space-between; padding: 16px 20px; border-top: 1px solid var(--sc-border); font-weight: 700; font-size: 18px; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; margin: 0; }
    dt { color: var(--sc-muted); }
    dd { margin: 0; }
    .capitalize { text-transform: capitalize; }
    .msg { margin-top: 16px; }
    .timeline { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px; }
    .timeline span { display: block; font-size: 12px; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class OrderDetail {
  private data = inject(DataService);
  private snack = inject(MatSnackBar);

  readonly id = input.required<string>();
  protected busy = signal(false);
  private legacyItems = signal<OrderItem[]>([]);

  protected order = toSignal(toObservable(this.id).pipe(switchMap((id) => this.data.order$(id))));

  protected customer = toSignal(
    toObservable(this.order).pipe(
      filter((o) => !!o?.user_id),
      switchMap((o) => this.data.customer$(o!.user_id)),
    ),
  );

  protected items = computed(() => this.order()?.items ?? this.legacyItems());
  protected itemsTotal = computed(() => this.items().reduce((t, i) => t + (i.total_price || 0), 0));

  constructor() {
    effect(() => {
      const o = this.order();
      if (o && !o.items) {
        this.data.legacyOrderItems(o.id).then((items) => this.legacyItems.set(items));
      }
    });
  }

  async setStatus(status: OrderStatus) {
    if (status === 'cancelled' && !confirm('Cancel this order? The customer will be notified.')) return;
    this.busy.set(true);
    try {
      await this.data.updateOrderStatus(this.id(), status);
      this.snack.open(`Order marked ${status}`, undefined, { duration: 2500 });
    } catch {
      this.snack.open('Could not update order', 'Dismiss');
    } finally {
      this.busy.set(false);
    }
  }
}
