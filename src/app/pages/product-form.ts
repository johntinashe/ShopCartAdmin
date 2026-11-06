import { Component, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataService } from '../core/data.service';
import { Product } from '../core/models';

@Component({
  selector: 'app-product-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="title">
          <a mat-icon-button routerLink="/products" aria-label="Back to products"><mat-icon>arrow_back</mat-icon></a>
          <h1>{{ id() ? 'Edit product' : 'New product' }}</h1>
        </div>
        <div class="actions">
          @if (id()) {
            <button mat-button class="danger" type="button" (click)="remove()" [disabled]="busy()">
              <mat-icon>delete</mat-icon> Delete
            </button>
          }
          <button mat-flat-button type="button" (click)="save()" [disabled]="form.invalid || busy()">
            <mat-icon>save</mat-icon> Save
          </button>
        </div>
      </div>

      @if (busy()) {
        <mat-progress-bar mode="indeterminate" />
      }

      <form class="layout" [formGroup]="form" (ngSubmit)="save()">
        <section class="panel panel-pad fields">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Name</mat-label>
            <input matInput formControlName="product_name" required />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Category</mat-label>
            <mat-select formControlName="product_category_id" required>
              @for (c of categories(); track c.id) {
                <mat-option [value]="c.id">{{ c.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>SKU</mat-label>
            <input matInput formControlName="product_id_sku" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Price (USD)</mat-label>
            <input matInput type="number" min="0" step="0.01" formControlName="product_price" required />
            <span matTextPrefix>$&nbsp;</span>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Stock quantity</mat-label>
            <input matInput type="number" min="0" step="1" formControlName="product_quantity" required />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Short description</mat-label>
            <input matInput formControlName="product_short_desc" maxlength="120" />
            <mat-hint align="end">{{ form.controls.product_short_desc.value.length }}/120</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Description</mat-label>
            <textarea matInput rows="5" formControlName="product_description"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Ingredients</mat-label>
            <textarea matInput rows="2" formControlName="product_ingredients"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Nutritional facts</mat-label>
            <textarea matInput rows="2" formControlName="product_nutritional_facts"></textarea>
          </mat-form-field>

          <div class="toggles full">
            <mat-slide-toggle formControlName="product_status">Visible in app</mat-slide-toggle>
            <mat-slide-toggle formControlName="product_featured">Featured on home screen</mat-slide-toggle>
          </div>
        </section>

        <section class="panel panel-pad image">
          <h2>Image</h2>
          <div class="preview">
            @if (imageUrl()) {
              <img [src]="imageUrl()" alt="Product image" />
            } @else {
              <mat-icon>image</mat-icon>
            }
          </div>
          <input #file type="file" accept="image/*" hidden (change)="onFile($any($event.target).files?.[0])" />
          <button mat-stroked-button type="button" (click)="file.click()" [disabled]="busy()">
            <mat-icon>upload</mat-icon> {{ imageUrl() ? 'Replace image' : 'Upload image' }}
          </button>
          <p class="muted small">JPG or PNG, under 5 MB. Square images look best.</p>
        </section>
      </form>
    </div>
  `,
  styles: `
    .title, .actions { display: flex; align-items: center; gap: 8px; }
    .danger { color: var(--sc-danger); }
    .layout { display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start; }
    .fields { display: grid; grid-template-columns: 1fr 1fr; column-gap: 16px; }
    .full { grid-column: 1 / -1; }
    .toggles { display: flex; gap: 24px; flex-wrap: wrap; }
    .image { display: flex; flex-direction: column; gap: 12px; }
    h2 { margin: 0; font-size: 16px; }
    .preview { aspect-ratio: 1; border-radius: 12px; background: var(--sc-bg); border: 1px dashed var(--sc-border); display: grid; place-items: center; overflow: hidden; }
    .preview img { width: 100%; height: 100%; object-fit: cover; }
    .preview mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--sc-muted); }
    .small { font-size: 12px; margin: 0; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .fields { grid-template-columns: 1fr; } }
  `,
})
export class ProductForm {
  private data = inject(DataService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  /** Route param (via withComponentInputBinding). Undefined for /products/new. */
  readonly id = input<string>();

  protected categories = toSignal(this.data.categories$(), { initialValue: [] });
  protected busy = signal(false);
  protected imageUrl = signal('');
  private thumbUrl = '';

  protected form = inject(FormBuilder).nonNullable.group({
    product_name: ['', Validators.required],
    product_category_id: ['', Validators.required],
    product_id_sku: [''],
    product_price: [0, [Validators.required, Validators.min(0)]],
    product_quantity: [0, [Validators.required, Validators.min(0)]],
    product_short_desc: [''],
    product_description: [''],
    product_ingredients: [''],
    product_nutritional_facts: [''],
    product_status: [true],
    product_featured: [false],
  });

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) this.load(id);
    });
  }

  private async load(id: string) {
    this.busy.set(true);
    const p = await firstValueFrom(this.data.product$(id));
    this.busy.set(false);
    if (!p) {
      this.snack.open('Product not found', 'Dismiss');
      this.router.navigateByUrl('/products');
      return;
    }
    this.form.patchValue({
      product_name: p.product_name ?? '',
      product_category_id: p.product_category_id ?? '',
      product_id_sku: p.product_id_sku ?? '',
      product_price: Number(p.product_price ?? 0),
      product_quantity: Number(p.product_quantity ?? 0),
      product_short_desc: p.product_short_desc ?? '',
      product_description: p.product_description ?? '',
      product_ingredients: p.product_ingredients ?? '',
      product_nutritional_facts: p.product_nutritional_facts ?? '',
      product_status: p.product_status !== false,
      product_featured: !!p.product_featured,
    });
    this.imageUrl.set(p.product_image ?? '');
    this.thumbUrl = p.product_thumb_image ?? '';
  }

  async onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.snack.open('Image must be under 5 MB', 'Dismiss');
      return;
    }
    this.busy.set(true);
    try {
      const url = await this.data.uploadImage('products', file);
      this.imageUrl.set(url);
      this.thumbUrl = url;
      this.form.markAsDirty();
    } catch {
      this.snack.open('Upload failed', 'Dismiss');
    } finally {
      this.busy.set(false);
    }
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    try {
      const value = this.form.getRawValue();
      const product: Product = {
        ...value,
        id: this.id() ?? this.data.newProductId(),
        product_price: Number(value.product_price),
        product_quantity: Math.floor(Number(value.product_quantity)),
        product_image: this.imageUrl(),
        product_thumb_image: this.thumbUrl || this.imageUrl(),
      };
      await this.data.saveProduct(product);
      this.snack.open('Product saved', undefined, { duration: 2500 });
      this.router.navigateByUrl('/products');
    } catch {
      this.snack.open('Could not save product', 'Dismiss');
    } finally {
      this.busy.set(false);
    }
  }

  async remove() {
    const id = this.id();
    if (!id || !confirm('Delete this product? This cannot be undone.')) return;
    this.busy.set(true);
    try {
      await this.data.deleteProduct(id);
      if (this.imageUrl()) await this.data.deleteImageByUrl(this.imageUrl());
      this.snack.open('Product deleted', undefined, { duration: 2500 });
      this.router.navigateByUrl('/products');
    } catch {
      this.snack.open('Could not delete product', 'Dismiss');
    } finally {
      this.busy.set(false);
    }
  }
}
