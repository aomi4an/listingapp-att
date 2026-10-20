import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { District, Listing, ListingFilter, ListingRequest } from '../models/listing';

// Условия, которые уходят на сервер как query-параметры
export type ServerFilter = Pick<ListingFilter, 'districtId' | 'maxPrice'>;

@Injectable({ providedIn: 'root' })
export class ListingApi {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // адреса — в одном месте; ими же пользуется httpResource на страницах
  listingsUrl = `${this.base}/api/listings`;
  mineUrl = `${this.base}/api/listings/mine`;
  districtsUrl = `${this.base}/api/districts`;
  listingUrl = (id: number | string) => `${this.base}/api/listings/${id}`;

  // превращает фильтр в query-параметры без null
  toParams(filter: ServerFilter): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (filter.districtId !== null) params['districtId'] = filter.districtId;
    if (filter.maxPrice !== null) params['maxPrice'] = filter.maxPrice;
    return params;
  }

  getAll(filter: ServerFilter = { districtId: null, maxPrice: null }) {
    return this.http.get<Listing[]>(this.listingsUrl, { params: new HttpParams({ fromObject: this.toParams(filter) }) });
  }
  getOne(id: number)                  { return this.http.get<Listing>(this.listingUrl(id)); }
  getDistricts()                      { return this.http.get<District[]>(this.districtsUrl); }
  create(r: ListingRequest)           { return this.http.post<Listing>(this.listingsUrl, r); }
  update(id: number, r: ListingRequest) { return this.http.put<void>(this.listingUrl(id), r); }
  delete(id: number)                  { return this.http.delete<void>(this.listingUrl(id)); }
}
