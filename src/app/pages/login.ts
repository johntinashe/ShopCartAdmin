import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressBarModule],
  template: `
    <div class="wrap">
      <form class="card panel" [formGroup]="form" (ngSubmit)="submit()">
        @if (busy()) {
          <mat-progress-bar mode="indeterminate" />
        }
        <div class="body">
          <img src="favicon.svg" alt="" width="44" height="44" />
          <h1>ShopCart Admin</h1>
          <p class="muted">Sign in with your admin account.</p>

          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="username" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="current-password" />
          </mat-form-field>

          @if (error()) {
            <p class="error">{{ error() }}</p>
          }

          <button mat-flat-button type="submit" [disabled]="form.invalid || busy()">Sign in</button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 16px; }
    .card { width: 100%; max-width: 380px; }
    .body { padding: 32px; display: flex; flex-direction: column; }
    h1 { margin: 16px 0 4px; font-size: 22px; }
    p.muted { margin: 0 0 24px; }
    .error { color: var(--sc-danger); margin: 0 0 16px; font-size: 14px; }
    button { height: 44px; }
  `,
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected busy = signal(false);
  protected error = signal('');
  protected form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async submit() {
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.signIn(email, password);
      await this.router.navigateByUrl('/dashboard');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error.set(msg.includes('auth/') ? 'Incorrect email or password.' : msg);
    } finally {
      this.busy.set(false);
    }
  }
}
