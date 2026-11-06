import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth, authState, signInWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { Firestore, doc, docData, getDoc, updateDoc } from '@angular/fire/firestore';
import { Observable, firstValueFrom, of, switchMap } from 'rxjs';
import { Admin } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private injector = inject(EnvironmentInjector);

  readonly user$: Observable<User | null> = authState(this.auth);
  readonly user = toSignal(this.user$, { initialValue: undefined });

  readonly admin = toSignal(
    this.user$.pipe(
      switchMap((u) =>
        u ? (docData(doc(this.firestore, 'admins', u.uid)) as Observable<Admin | undefined>) : of(undefined),
      ),
    ),
  );

  /** Resolves once Firebase has restored the session. */
  currentUser(): Promise<User | null> {
    return firstValueFrom(this.user$);
  }

  async isAdmin(uid: string): Promise<boolean> {
    return runInInjectionContext(this.injector, async () => {
      const snap = await getDoc(doc(this.firestore, 'admins', uid));
      return snap.exists();
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    const cred = await runInInjectionContext(this.injector, () =>
      signInWithEmailAndPassword(this.auth, email, password),
    );
    if (!(await this.isAdmin(cred.user.uid))) {
      await this.signOut();
      throw new Error('This account is not an admin.');
    }
    await runInInjectionContext(this.injector, () =>
      updateDoc(doc(this.firestore, 'admins', cred.user.uid), { last_login: Date.now() }),
    ).catch(() => undefined);
  }

  signOut(): Promise<void> {
    return runInInjectionContext(this.injector, () => signOut(this.auth));
  }
}
