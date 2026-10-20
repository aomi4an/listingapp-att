import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Раньше админка открывалась по адресу /#admin. Старые ссылки и закладки ведём на /admin.
export const legacyAdminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  return router.parseUrl(state.url).fragment === 'admin' ? router.createUrlTree(['/admin']) : true;
};
