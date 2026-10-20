import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { District, Listing, ListingRequest } from '../models/listing';
import { ListingApi } from '../services/listing-api';

// Запросы страницы /admin: идут с ключом администратора (заголовок X-Admin-Key).
// Читать данные админка может через обычный ListingApi.
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private http = inject(HttpClient);
  private api = inject(ListingApi);

  private auth(key: string) {
    return { headers: new HttpHeaders({ 'X-Admin-Key': key }) };
  }

  ping(key: string) {
    return this.http.get<void>(`${environment.apiUrl}/api/admin/ping`, this.auth(key));
  }

  createListing(key: string, body: ListingRequest) {
    return this.http.post<Listing>(this.api.listingsUrl, body, this.auth(key));
  }
  updateListing(key: string, id: number, body: ListingRequest) {
    return this.http.put<void>(this.api.listingUrl(id), body, this.auth(key));
  }
  deleteListing(key: string, id: number) {
    return this.http.delete<void>(this.api.listingUrl(id), this.auth(key));
  }

  createDistrict(key: string, name: string) {
    return this.http.post<District>(this.api.districtsUrl, { name }, this.auth(key));
  }
  updateDistrict(key: string, id: number, name: string) {
    return this.http.put<void>(`${this.api.districtsUrl}/${id}`, { name }, this.auth(key));
  }
  deleteDistrict(key: string, id: number) {
    return this.http.delete<void>(`${this.api.districtsUrl}/${id}`, this.auth(key));
  }
}
