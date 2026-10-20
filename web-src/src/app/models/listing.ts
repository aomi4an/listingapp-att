// Точная копия ListingResponse из API (camelCase, createdAt — ISO-строка)
export interface Listing {
  id: number;
  title: string;
  price: number;
  rooms: number;
  districtId: number;
  districtName: string;
  address?: string | null;
  createdAt: string;
  ownerId: number | null;     // автор; null у объявлений без автора
}

export interface District {
  id: number;
  name: string;
  listingsCount: number;
}

export type SortMode = 'newest' | 'priceAsc' | 'priceDesc';

export interface ListingFilter {
  districtId: number | null;   // null = все районы
  maxPrice: number | null;     // null = без ограничения
  sort: SortMode;              // сортировка — на клиенте, на запрос к API не влияет
  onlyFavorites: boolean;      // «только избранное» — тоже на клиенте
}

// То, что уходит на сервер в POST и PUT — совпадает с CreateListingRequest / UpdateListingRequest
export interface ListingRequest {
  title: string;
  price: number;
  rooms: number;
  districtId: number;
  address: string | null;
}
