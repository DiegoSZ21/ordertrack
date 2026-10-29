import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/user.model';

export function roleGuard(allowedRoles: Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn) {
      router.navigate(['/login']);
      return false;
    }

    const user = auth.currentUser;
    if (!user || !allowedRoles.includes(user.role)) {
      // Redirigir según el rol del usuario
      auth.redirectByRole();
      return false;
    }

    return true;
  };
}

