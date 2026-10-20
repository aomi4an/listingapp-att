import { Component, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Listing } from '../../models/listing';
import { ListingApi } from '../../services/listing-api';
import { ErrorMessagePipe } from '../../pipes/error-message.pipe';
import { ListingList } from '../../listing-list/listing-list';
import { Skeleton } from '../../skeleton/skeleton';

// «Мои объявления» (/my): сервер сам знает пользователя по токену — GET /api/listings/mine
@Component({
  selector: 'app-my-listings-page',
  imports: [ListingList, Skeleton, ErrorMessagePipe, RouterLink],
  templateUrl: './my-listings-page.html',
  styleUrl: './my-listings-page.css',
})
export class MyListingsPage {
  private api = inject(ListingApi);

  items = httpResource<Listing[]>(() => this.api.mineUrl);

  list = computed<Listing[]>(() => (this.items.hasValue() ? (this.items.value() ?? []) : []));
}
