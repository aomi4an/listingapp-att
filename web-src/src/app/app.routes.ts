import { Routes } from '@angular/router';
import { ListingsPage } from './pages/listings-page/listings-page';
import { MyListingsPage } from './pages/my-listings-page/my-listings-page';
import { LoginPage } from './pages/login-page/login-page';
import { RegisterPage } from './pages/register-page/register-page';
import { NotFoundPage } from './pages/not-found-page/not-found-page';
import { authGuard } from './guards/auth.guard';
import { unsavedGuard } from './guards/unsaved.guard';
import { legacyAdminGuard } from './guards/legacy-admin.guard';

// Редкие и тяжёлые страницы грузятся лениво (loadComponent): отдельный chunk скачивается
// только при первом заходе на них, начальная загрузка сайта остаётся лёгкой.
const listingPage = () => import('./pages/listing-page/listing-page').then(m => m.ListingPage);
const listingFormPage = () => import('./pages/listing-form-page/listing-form-page').then(m => m.ListingFormPage);
const adminPage = () => import('./admin/admin').then(m => m.Admin);

export const routes: Routes = [
  { path: '',                  component: ListingsPage, canActivate: [legacyAdminGuard], title: 'Объявления' },
  { path: 'my',                component: MyListingsPage, canActivate: [authGuard], title: 'Мои объявления' },
  { path: 'login',             component: LoginPage,    title: 'Вход' },
  { path: 'register',          component: RegisterPage, title: 'Регистрация' },
  // listings/new — выше listings/:id, иначе «new» примется за id
  { path: 'listings/new',      loadComponent: listingFormPage, canActivate: [authGuard], canDeactivate: [unsavedGuard], title: 'Новое объявление' },
  { path: 'listings/:id/edit', loadComponent: listingFormPage, canActivate: [authGuard], canDeactivate: [unsavedGuard], title: 'Редактирование' },
  { path: 'listings/:id',      loadComponent: listingPage, title: 'Объявление' },
  { path: 'admin',             loadComponent: adminPage, title: 'Управление' },
  { path: '**',                component: NotFoundPage, title: 'Страница не найдена' },
];
