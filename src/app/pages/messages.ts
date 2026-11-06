import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { ChatMessage, Conversation, fullName } from '../core/models';
import { MillisPipe } from '../shared/pipes';

@Component({
  selector: 'app-messages',
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MillisPipe],
  template: `
    <div class="page">
      <div class="page-header"><h1>Messages</h1></div>
      <div class="panel chat" [class.has-selection]="!!uid()">
        <aside class="list">
          @for (c of conversations(); track c.id) {
            <a class="conv" [routerLink]="['/messages', c.id]" [class.active]="c.id === uid()">
              <span class="avatar">{{ initial(c) }}</span>
              <div class="grow">
                <div class="conv-top">
                  <span class="strong">{{ label(c) }}</span>
                  <span class="muted small">{{ c.time | millis | date: 'd MMM' }}</span>
                </div>
                <div class="muted small preview">{{ c.lastMsg }}</div>
              </div>
              @if ((c.unread_admin ?? 0) > 0) {
                <span class="unread">{{ c.unread_admin }}</span>
              }
            </a>
          } @empty {
            <div class="empty">No conversations yet.</div>
          }
        </aside>

        <section class="thread">
          @if (uid()) {
            <header>
              <button mat-icon-button class="back" (click)="router.navigateByUrl('/messages')" aria-label="Back">
                <mat-icon>arrow_back</mat-icon>
              </button>
              <a class="strong" [routerLink]="['/customers', uid()]">{{ title() }}</a>
            </header>
            <div class="messages" #scroller>
              @for (m of messages(); track m.id) {
                <div class="bubble" [class.mine]="m.from !== uid()">
                  <div>{{ m.message }}</div>
                  <div class="time">{{ m.time | millis | date: 'd MMM, HH:mm' }}</div>
                </div>
              } @empty {
                <div class="empty">No messages yet.</div>
              }
            </div>
            <form class="composer" (submit)="send($event)">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="grow">
                <input
                  matInput
                  placeholder="Write a reply…"
                  [value]="draft()"
                  (input)="draft.set($any($event.target).value)"
                  autocomplete="off"
                />
              </mat-form-field>
              <button mat-flat-button type="submit" [disabled]="!draft().trim() || sending()">
                <mat-icon>send</mat-icon> Send
              </button>
            </form>
          } @else {
            <div class="empty pick">Select a conversation.</div>
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .chat { display: grid; grid-template-columns: 300px 1fr; height: calc(100vh - 160px); min-height: 420px; }
    .list { border-right: 1px solid var(--sc-border); overflow-y: auto; }
    .conv { display: flex; gap: 12px; align-items: center; padding: 12px 16px; text-decoration: none; color: inherit; border-bottom: 1px solid var(--sc-border); }
    .conv.active, .conv:hover { background: color-mix(in srgb, var(--mat-sys-primary) 7%, transparent); }
    .avatar { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; font-weight: 600; background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); }
    .grow { flex: 1; min-width: 0; }
    .conv-top { display: flex; justify-content: space-between; gap: 8px; }
    .preview { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .unread { background: var(--mat-sys-primary); color: var(--mat-sys-on-primary); border-radius: 999px; padding: 0 7px; font-size: 12px; font-weight: 600; }
    .strong { font-weight: 600; color: inherit; text-decoration: none; }
    .small { font-size: 12px; }
    .thread { display: flex; flex-direction: column; min-height: 0; }
    header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--sc-border); }
    .back { display: none; }
    .messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .bubble { max-width: 70%; padding: 8px 12px; border-radius: 14px 14px 14px 4px; background: var(--sc-bg); align-self: flex-start; white-space: pre-wrap; word-break: break-word; }
    .bubble.mine { align-self: flex-end; border-radius: 14px 14px 4px 14px; background: var(--mat-sys-primary); color: var(--mat-sys-on-primary); }
    .time { font-size: 11px; opacity: 0.7; margin-top: 2px; text-align: right; }
    .composer { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--sc-border); align-items: center; }
    .pick { margin: auto; }
    @media (max-width: 800px) {
      .chat { grid-template-columns: 1fr; }
      .chat.has-selection .list { display: none; }
      .chat:not(.has-selection) .thread { display: none; }
      .back { display: inline-flex; }
    }
  `,
})
export class Messages {
  private data = inject(DataService);
  private auth = inject(AuthService);
  protected router = inject(Router);

  readonly uid = input<string>();
  protected draft = signal('');
  protected sending = signal(false);
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  protected conversations = toSignal(this.data.conversations$(), { initialValue: [] as Conversation[] });

  protected messages = toSignal(
    toObservable(this.uid).pipe(switchMap((uid) => (uid ? this.data.chat$(uid) : of([])))),
    { initialValue: [] as ChatMessage[] },
  );

  private customer = toSignal(
    toObservable(this.uid).pipe(switchMap((uid) => (uid ? this.data.customer$(uid) : of(undefined)))),
  );

  protected title = computed(() => {
    const c = this.customer();
    if (c) return fullName(c);
    const conv = this.conversations().find((x) => x.id === this.uid());
    return conv ? this.label(conv) : 'Customer';
  });

  constructor() {
    // Mark incoming messages as read when a thread is open.
    effect(() => {
      const uid = this.uid();
      const msgs = this.messages();
      if (uid && msgs.some((m) => m.from === uid && !m.seen)) {
        this.data.markCustomerMessagesSeen(uid).catch(() => undefined);
      }
    });
    // Keep the newest message in view.
    effect(() => {
      this.messages();
      const el = this.scroller()?.nativeElement;
      if (el) queueMicrotask(() => (el.scrollTop = el.scrollHeight));
    });
  }

  label(c: Conversation): string {
    return c.username || `Customer ${c.id.slice(0, 6)}`;
  }

  initial(c: Conversation): string {
    return this.label(c).charAt(0).toUpperCase();
  }

  async send(event: Event) {
    event.preventDefault();
    const uid = this.uid();
    const adminUid = this.auth.user()?.uid;
    const text = this.draft().trim();
    if (!uid || !adminUid || !text) return;
    this.sending.set(true);
    try {
      await this.data.sendMessage(uid, adminUid, text);
      this.draft.set('');
    } finally {
      this.sending.set(false);
    }
  }
}
