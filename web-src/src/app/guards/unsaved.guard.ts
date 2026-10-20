import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  canLeave(): boolean;
}

// Не даёт случайно уйти с формы, где есть несохранённые изменения (задание ★ урока 6)
export const unsavedGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => component.canLeave();
