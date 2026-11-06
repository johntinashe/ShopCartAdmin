import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataService } from '../core/data.service';
import { Category } from '../core/models';

@Component({
  selector: 'app-categories',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Categories</h1>
        @if (!editing()) {
          <button mat-flat-button (click)="startNew()"><mat-icon>add</mat-icon> New category</button>
        }
      </div>

      @if (editing()) {
        <form class="panel panel-pad editor" [formGroup]="form" (ngSubmit)="save()">
          <div class="preview">
            @if (image()) {
              <img [src]="image()" alt="" />
            } @else {
              <mat-icon>category</mat-icon>
            }
          </div>
          <div class="fields">
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name" required />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Description</mat-label>
              <input matInput formControlName="description" />
            </mat-form-field>
            <div class="row">
              <mat-slide-toggle formControlName="active">Active</mat-slide-toggle>
              <input #file type="file" accept="image/*" hidden (change)="onFile($any($event.target).files?.[0])" />
              <button mat-stroked-button type="button" (click)="file.click()" [disabled]="busy()">
                <mat-icon>upload</mat-icon> Image
              </button>
              <span class="spacer"></span>
              @if (editing() !== 'new') {
                <button mat-button type="button" class="danger" (click)="remove()" [disabled]="busy()">Delete</button>
              }
              <button mat-button type="button" (click)="editing.set(null)">Cancel</button>
              <button mat-flat-button type="submit" [disabled]="form.invalid || busy()">Save</button>
            </div>
          </div>
        </form>
      }

      <div class="grid">
        @for (c of categories(); track c.id) {
          <button class="card panel" type="button" (click)="edit(c)" [class.inactive]="c.active === false">
            <div class="img">
              @if (c.catimage) {
                <img [src]="c.catimage" alt="" />
              } @else {
                <mat-icon>category</mat-icon>
              }
            </div>
            <div class="info">
              <div class="name">{{ c.name }}</div>
              <div class="muted small">
                {{ counts()[c.id] ?? '…' }} products
                @if (c.active === false) {
                  · hidden
                }
              </div>
            </div>
          </button>
        } @empty {
          <div class="empty">No categories yet.</div>
        }
      </div>
    </div>
  `,
  styles: `
    .editor { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
    .fields { flex: 1; min-width: 260px; display: flex; flex-direction: column; }
    .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .spacer { flex: 1; }
    .danger { color: var(--sc-danger); }
    .preview { width: 140px; height: 140px; border-radius: 12px; background: var(--sc-bg); display: grid; place-items: center; overflow: hidden; }
    .preview img, .img img { width: 100%; height: 100%; object-fit: cover; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .card { text-align: left; padding: 0; cursor: pointer; font: inherit; color: inherit; }
    .card:hover { border-color: var(--mat-sys-primary); }
    .card.inactive { opacity: 0.6; }
    .img { height: 120px; background: var(--sc-bg); display: grid; place-items: center; }
    .img mat-icon { color: var(--sc-muted); }
    .info { padding: 12px 16px; }
    .name { font-weight: 600; }
    .small { font-size: 12px; }
  `,
})
export class Categories {
  private data = inject(DataService);
  private snack = inject(MatSnackBar);

  protected categories = toSignal(this.data.categories$(), { initialValue: [] as Category[] });
  protected counts = signal<Record<string, number>>({});
  protected editing = signal<string | null>(null);
  protected image = signal('');
  protected busy = signal(false);

  protected form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    active: [true],
  });

  private requested = new Set<string>();

  constructor() {
    effect(() => {
      for (const c of this.categories()) {
        if (this.requested.has(c.id)) continue;
        this.requested.add(c.id);
        this.data
          .countProductsInCategory(c.id)
          .then((n) => this.counts.update((m) => ({ ...m, [c.id]: n })))
          .catch(() => undefined);
      }
    });
  }

  startNew() {
    this.form.reset({ name: '', description: '', active: true });
    this.image.set('');
    this.editing.set('new');
  }

  edit(c: Category) {
    this.form.reset({ name: c.name ?? '', description: c.description ?? '', active: c.active !== false });
    this.image.set(c.catimage ?? '');
    this.editing.set(c.id);
  }

  async onFile(file: File | undefined) {
    if (!file) return;
    this.busy.set(true);
    try {
      this.image.set(await this.data.uploadImage('categories', file));
    } catch {
      this.snack.open('Upload failed', 'Dismiss');
    } finally {
      this.busy.set(false);
    }
  }

  async save() {
    const editing = this.editing();
    if (!editing || this.form.invalid) return;
    this.busy.set(true);
    try {
      const v = this.form.getRawValue();
      await this.data.saveCategory({
        ...(editing !== 'new' ? { id: editing } : {}),
        name: v.name.trim(),
        description: v.description.trim(),
        active: v.active,
        catimage: this.image(),
      });
      this.editing.set(null);
      this.snack.open('Category saved', undefined, { duration: 2500 });
    } catch {
      this.snack.open('Could not save category', 'Dismiss');
    } finally {
      this.busy.set(false);
    }
  }

  async remove() {
    const id = this.editing();
    if (!id || id === 'new') return;
    const count = this.counts()[id] ?? 0;
    if (count > 0) {
      this.snack.open(`Move or delete its ${count} products first.`, 'OK');
      return;
    }
    if (!confirm('Delete this category?')) return;
    await this.data.deleteCategory(id);
    this.editing.set(null);
  }
}
