import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../core/data.service';
import { Customer, fullName } from '../core/models';
import { FullNamePipe } from '../shared/pipes';

@Component({
  selector: 'app-customers',
  imports: [MatTableModule, MatFormFieldModule, MatInputModule, MatIconModule, FullNamePipe],
  template: `
    <div class="page">
      <div class="page-header"><h1>Customers</h1></div>

      <div class="toolbar-row">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Search name, email or phone</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput (input)="search.set($any($event.target).value)" />
        </mat-form-field>
        <span class="muted">{{ filtered().length }} customers</span>
      </div>

      <div class="panel table-wrap">
        <table mat-table [dataSource]="filtered()">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let c">
              <div class="person">
                @if (c.thumb_image || c.image) {
                  <img class="thumb round" [src]="c.thumb_image || c.image" alt="" />
                } @else {
                  <span class="thumb round initials">{{ initials(c) }}</span>
                }
                <span class="strong">{{ c | fullName }}</span>
              </div>
            </td>
          </ng-container>
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let c">{{ c.email || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="phone">
            <th mat-header-cell *matHeaderCellDef>Phone</th>
            <td mat-cell *matCellDef="let c">{{ c.phoneNumber || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="address">
            <th mat-header-cell *matHeaderCellDef>Address</th>
            <td mat-cell *matCellDef="let c" class="muted">{{ c.address || '—' }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let c; columns: columns" class="clickable" (click)="open(c)"></tr>
        </table>
        @if (!filtered().length) {
          <div class="empty">No customers found.</div>
        }
      </div>
    </div>
  `,
  styles: `
    .table-wrap { overflow-x: auto; }
    .person { display: flex; align-items: center; gap: 12px; padding: 6px 0; }
    .round { border-radius: 50%; }
    .initials { display: inline-grid; place-items: center; font-weight: 600; font-size: 14px; color: var(--mat-sys-on-primary-container); background: var(--mat-sys-primary-container); }
    .strong { font-weight: 600; }
  `,
})
export class Customers {
  private data = inject(DataService);
  private router = inject(Router);

  protected columns = ['name', 'email', 'phone', 'address'];
  protected search = signal('');
  private customers = toSignal(this.data.customers$(), { initialValue: [] as Customer[] });

  protected filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = [...this.customers()].sort((a, b) => fullName(a).localeCompare(fullName(b)));
    if (!q) return list;
    return list.filter((c) =>
      [fullName(c), c.email, c.phoneNumber].some((v) => (v ?? '').toLowerCase().includes(q)),
    );
  });

  initials(c: Customer): string {
    return ((c.name?.[0] ?? '') + (c.surname?.[0] ?? '')).toUpperCase() || '?';
  }

  open(c: Customer) {
    this.router.navigate(['/customers', c.id]);
  }
}
