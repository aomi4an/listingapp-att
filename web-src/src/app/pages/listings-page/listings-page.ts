import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { District, Listing, ListingFilter as FilterValue } from '../../models/listing';
import { ListingApi } from '../../services/listing-api';
import { Favorites } from '../../services/favorites';
import { ErrorMessagePipe } from '../../pipes/error-message.pipe';
import { ListingFilter } from '../../listing-filter/listing-filter';
import { ListingList } from '../../listing-list/listing-list';
import { Skeleton } from '../../skeleton/skeleton';

@Component({
  selector: 'app-listings-page',
  imports: [ListingFilter, ListingList, Skeleton, ErrorMessagePipe],
  templateUrl: './listings-page.html',
  styleUrl: './listings-page.css',
})
export class ListingsPage {
  private api = inject(ListingApi);
  private favorites = inject(Favorites);

  filter = signal<FilterValue>({ districtId: null, maxPrice: null, sort: 'newest', onlyFavorites: false });

  // Условия, которые уходят на сервер. Сравнение по значению: смена сортировки или
  // «только избранное» новый запрос не вызывает — меняется только порядок на экране.
  private query = computed(
    () => {
      const { districtId, maxPrice } = this.filter();
      return { districtId, maxPrice };
    },
    { equal: (a, b) => a.districtId === b.districtId && a.maxPrice === b.maxPrice },
  );

  // зависит от query(): изменился район или цена — новый запрос, старый отменён
  listings = httpResource<Listing[]>(() => ({
    url: this.api.listingsUrl,
    params: this.api.toParams(this.query()),
  }));

  districts = httpResource<District[]>(() => this.api.districtsUrl, { defaultValue: [] });

  // value() в состоянии ошибки бросает исключение, поэтому читаем только через hasValue()
  private loaded = computed<Listing[]>(() => (this.listings.hasValue() ? (this.listings.value() ?? []) : []));
  districtList = computed<District[]>(() => (this.districts.hasValue() ? (this.districts.value() ?? []) : []));

  // всего объявлений — из справочника районов, чтобы не делать лишний запрос
  total = computed(() => this.districtList().reduce((sum, d) => sum + d.listingsCount, 0));

  // что показываем: «только избранное» и сортировка поверх ответа сервера.
  // Массив не сортируем на месте — копия [...list]
  visible = computed(() => {
    const { sort, onlyFavorites } = this.filter();
    const favs = this.favorites.all();
    const list = onlyFavorites ? this.loaded().filter(l => favs.has(l.id)) : [...this.loaded()];

    switch (sort) {
      case 'priceAsc':  return list.sort((a, b) => a.price - b.price);
      case 'priceDesc': return list.sort((a, b) => b.price - a.price);
      default:          return list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }
  });

  onFilter(value: FilterValue) {
    this.filter.set(value);
  }

  // Кнопка «Обновить»: заново и объявления, и районы (счётчики)
  refresh() {
    this.listings.reload();
    this.districts.reload();
  }
}
