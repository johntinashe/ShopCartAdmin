import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataService } from '../core/data.service';
import { Product } from '../core/models';

@Component({
  selector: 'app-products',
  imports: [
    RouterLink,
    CurrencyPipe,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Products</h1>
        <a mat-flat-button routerLink="/products/new"><mat-icon>add</mat-icon> New product</a>
      </div>

      <div class="toolbar-row">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Search</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [value]="search()" (input)="search.set($any($event.target).value)" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Category</mat-label>
          <mat-select [value]="category()" (selectionChange)="category.set($event.value)">
            <mat-option value="">All categories</mat-option>
            @for (c of categories(); track c.id) {
              <mat-option [value]="c.id">{{ c.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <span class="muted">{{ filtered().length }} of {{ products().length }}</span>
      </div>

      <div class="panel">
        <table mat-table [dataSource]="filtered()">
          <ng-container matColumnDef="product">
            <th mat-header-cell *matHeaderCellDef>Product</th>
            <td mat-cell *matCellDef="let p">
              <div class="product">
                <img class="thumb" [src]="p.product_thumb_image || p.product_image || 'favicon.svg'" alt="" />
                <div>
                  <div class="name">{{ p.product_name }}</div>
                  <div class="muted small">{{ categoryName(p.product_category_id) }}</div>
                </div>
              </div>
            </td>
          </ng-container>
          <ng-container matColumnDef="price">
            <th mat-header-cell *matHeaderCellDef>Price</th>
            <td mat-cell *matCellDef="let p">{{ p.product_price | currency: 'USD' }}</td>
          </ng-container>
          <ng-container matColumnDef="stock">
            <th mat-header-cell *matHeaderCellDef>Stock</th>
            <td mat-cell *matCellDef="let p">
              <span [class.low]="p.product_quantity <= 5">{{ p.product_quantity }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="active">
            <th mat-header-cell *matHeaderCellDef>Visible</th>
            <td mat-cell *matCellDef="let p" (click)="$event.stopPropagation()">
              <mat-slide-toggle
                [checked]="p.product_status !== false"
                (change)="toggle(p, $event.checked)"
                [aria-label]="'Show ' + p.product_name + ' in the app'"
              />
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let p; columns: columns" class="clickable" (click)="open(p)"></tr>
        </table>
        @if (!filtered().length) {
          <div class="empty">No products match.</div>
        }
      </div>
    </div>
  `,
  styles: `
    .product { display: flex; align-items: center; gap: 12px; padding: 6px 0; }
    .name { font-weight: 600; }
    .small { font-size: 12px; }
    .low { color: var(--sc-danger); font-weight: 600; }
  `,
})
export class Products {
  private data = inject(DataService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  protected columns = ['product', 'price', 'stock', 'active'];
  protected products = toSignal(this.data.products$(), { initialValue: [] as Product[] });
  protected categories = toSignal(this.data.categories$(), { initialValue: [] });
  protected search = signal('');
  protected category = signal('');

  private categoryMap = computed(() => new Map(this.categories().map((c) => [c.id, c.name])));

  protected filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.category();
    return this.products().filter(
      (p) =>
        (!cat || p.product_category_id === cat) &&
        (!q ||
          p.product_name?.toLowerCase().includes(q) ||
          p.product_id_sku?.toLowerCase().includes(q)),
    );
  });

  categoryName(id: string): string {
    return this.categoryMap().get(id) ?? 'Uncategorised';
  }

  open(p: Product) {
    this.router.navigate(['/products', p.id]);
  }

  async toggle(p: Product, active: boolean) {
    try {
      await this.data.setProductStatus(p.id, active);
      this.snack.open(`${p.product_name} is now ${active ? 'visible' : 'hidden'}`, undefined, { duration: 2500 });
    } catch {
      this.snack.open('Could not update product', 'Dismiss');
    }
  }
}
