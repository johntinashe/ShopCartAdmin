import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await auth.currentUser();
  if (user && (await auth.isAdmin(user.uid))) return true;
  if (user) await auth.signOut();
  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await auth.currentUser();
  if (user && (await auth.isAdmin(user.uid))) return router.createUrlTree(['/dashboard']);
  return true;
};
