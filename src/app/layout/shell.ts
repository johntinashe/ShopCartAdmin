import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { map } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
  ],
  template: `
    <mat-sidenav-container class="container">
      <mat-sidenav
        #drawer
        [mode]="isHandset() ? 'over' : 'side'"
        [opened]="!isHandset()"
        class="sidenav"
      >
        <div class="brand">
          <img src="favicon.svg" alt="" width="32" height="32" />
          <span>ShopCart</span>
        </div>
        <mat-nav-list>
          @for (item of nav; track item.path) {
            <a
              mat-list-item
              [routerLink]="item.path"
              routerLinkActive
              #rla="routerLinkActive"
              [activated]="rla.isActive"
              (click)="isHandset() && drawer.close()"
            >
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
              @if (item.path === '/messages' && unread() > 0) {
                <span matListItemMeta class="badge">{{ unread() }}</span>
              }
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="toolbar">
          @if (isHandset()) {
            <button mat-icon-button (click)="drawer.toggle()" aria-label="Open menu">
              <mat-icon>menu</mat-icon>
            </button>
          }
          <span class="spacer"></span>
          <button mat-button [matMenuTriggerFor]="account">
            <mat-icon>account_circle</mat-icon>
            {{ adminName() }}
          </button>
          <mat-menu #account="matMenu">
            <div class="menu-email">{{ auth.user()?.email }}</div>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              Sign out
            </button>
          </mat-menu>
        </mat-toolbar>
        <main>
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .container { height: 100vh; background: var(--sc-bg); }
    .sidenav { width: 240px; border-right: 1px solid var(--sc-border); background: var(--sc-surface); }
    .brand { display: flex; align-items: center; gap: 10px; padding: 20px 20px 12px; font-weight: 700; font-size: 18px; }
    .toolbar { position: sticky; top: 0; z-index: 2; background: var(--sc-surface); border-bottom: 1px solid var(--sc-border); }
    .spacer { flex: 1; }
    .badge { background: var(--mat-sys-primary); color: var(--mat-sys-on-primary); border-radius: 999px; padding: 0 8px; font-size: 12px; font-weight: 600; }
    .menu-email { padding: 8px 16px; font-size: 13px; color: var(--sc-muted); }
  `,
})
export class Shell {
  protected auth = inject(AuthService);
  private data = inject(DataService);
  private router = inject(Router);

  protected readonly nav = [
    { path: '/dashboard', label: 'Dashboard', icon: 'space_dashboard' },
    { path: '/orders', label: 'Orders', icon: 'receipt_long' },
    { path: '/products', label: 'Products', icon: 'inventory_2' },
    { path: '/categories', label: 'Categories', icon: 'category' },
    { path: '/customers', label: 'Customers', icon: 'group' },
    { path: '/messages', label: 'Messages', icon: 'forum' },
  ];

  protected isHandset = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 959px)')
      .pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  protected unread = toSignal(
    this.data.conversations$().pipe(map((list) => list.reduce((n, c) => n + (c.unread_admin ?? 0), 0))),
    { initialValue: 0 },
  );

  protected adminName = computed(() => {
    const a = this.auth.admin();
    return a?.name || this.auth.user()?.email?.split('@')[0] || 'Admin';
  });

  async logout() {
    await this.auth.signOut();
    await this.router.navigateByUrl('/login');
  }
}
