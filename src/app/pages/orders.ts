import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../core/data.service';
import { Order, OrderStatus } from '../core/models';
import { StatusLabelPipe } from '../shared/pipes';

type Filter = OrderStatus | 'all';

@Component({
  selector: 'app-orders',
  imports: [
    CurrencyPipe,
    DatePipe,
    MatTableModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    StatusLabelPipe,
  ],
  template: `
    <div class="page">
      <div class="page-header"><h1>Orders</h1></div>

      <div class="toolbar-row">
        <mat-button-toggle-group [value]="filter()" (change)="filter.set($event.value)" aria-label="Order status">
          @for (f of filters; track f.value) {
            <mat-button-toggle [value]="f.value">{{ f.label }}</mat-button-toggle>
          }
        </mat-button-toggle-group>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Search customer or order</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput (input)="search.set($any($event.target).value)" />
        </mat-form-field>
      </div>

      <div class="panel table-wrap">
        <table mat-table [dataSource]="filtered()">
          <ng-container matColumnDef="placed">
            <th mat-header-cell *matHeaderCellDef>Placed</th>
            <td mat-cell *matCellDef="let o">{{ o.placed_at | date: 'd MMM y, HH:mm' }}</td>
          </ng-container>
          <ng-container matColumnDef="customer">
            <th mat-header-cell *matHeaderCellDef>Customer</th>
            <td mat-cell *matCellDef="let o">
              <div class="strong">{{ o.user_name || 'Customer' }}</div>
              <div class="muted small">#{{ o.id.slice(0, 8) }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="items">
            <th mat-header-cell *matHeaderCellDef>Items</th>
            <td mat-cell *matCellDef="let o">{{ o.quantity ?? '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="payment">
            <th mat-header-cell *matHeaderCellDef>Payment</th>
            <td mat-cell *matCellDef="let o" class="capitalize">{{ o.payment?.method || 'card (2018)' }}</td>
          </ng-container>
          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef>Total</th>
            <td mat-cell *matCellDef="let o" class="strong">
              {{ o.amount != null ? (o.amount | currency: 'USD') : '—' }}
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let o">
              <span class="status-chip" [class]="o.status">{{ o.status | statusLabel }}</span>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let o; columns: columns" class="clickable" (click)="open(o)"></tr>
        </table>
        @if (!filtered().length) {
          <div class="empty">No orders here.</div>
        }
      </div>
    </div>
  `,
  styles: `
    .table-wrap { overflow-x: auto; }
    .strong { font-weight: 600; }
    .small { font-size: 12px; }
    .capitalize { text-transform: capitalize; }
  `,
})
export class Orders {
  private data = inject(DataService);
  private router = inject(Router);

  protected filters: { value: Filter; label: string }[] = [
    { value: 'new', label: 'To fulfil' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'pending_payment', label: 'Awaiting payment' },
    { value: 'all', label: 'All' },
  ];
  protected columns = ['placed', 'customer', 'items', 'payment', 'amount', 'status'];
  protected filter = signal<Filter>('new');
  protected search = signal('');

  private orders = toSignal(
    toObservable(this.filter).pipe(
      switchMap((f) => this.data.orders$(f === 'all' ? undefined : f)),
    ),
    { initialValue: [] as Order[] },
  );

  protected filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.orders();
    return this.orders().filter(
      (o) => o.id.toLowerCase().includes(q) || (o.user_name ?? '').toLowerCase().includes(q),
    );
  });

  open(o: Order) {
    this.router.navigate(['/orders', o.id]);
  }
}
