import { Component, computed, input } from '@angular/core';

// Серые заглушки в форме карточек, пока идёт загрузка (задание ★ урока 5)
@Component({
  selector: 'app-skeleton',
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.css',
})
export class Skeleton {
  count = input(6);
  items = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
