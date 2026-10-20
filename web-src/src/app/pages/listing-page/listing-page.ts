import { Component, computed, inject, input, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Listing } from '../../models/listing';
import { ListingApi } from '../../services/listing-api';
import { AuthService } from '../../services/auth.service';
import { ErrorMessagePipe, errorMessage, errorStatus } from '../../pipes/error-message.pipe';
import { ListingDetails } from '../../listing-details/listing-details';

@Component({
  selector: 'app-listing-page',
  imports: [ListingDetails, ErrorMessagePipe, RouterLink],
  templateUrl: './listing-page.html',
  styleUrl: './listing-page.css',
})
export class ListingPage {
  private api = inject(ListingApi);
  private auth = inject(AuthService);
  private router = inject(Router);

  id = input.required<string>();     // из маршрута :id — всегда строка

  listing = httpResource<Listing>(() => this.api.listingUrl(this.id()));

  item = computed(() => (this.listing.hasValue() ? this.listing.value() : undefined));
  notFound = computed(() => errorStatus(this.listing.error()) === 404);

  // Кнопки — только автору. Объявление без автора (ownerId = null) не принадлежит никому:
  // сравнивать null с id гостя нельзя, поэтому ownerId проверяем отдельно.
  canEdit = computed(() => {
    const l = this.item();
    return !!l && typeof l.ownerId === 'number' && l.ownerId === this.auth.userId();
  });

  deleting = signal(false);
  deleteError = signal<string | null>(null);

  async remove() {
    if (!confirm('Удалить объявление?')) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await firstValueFrom(this.api.delete(Number(this.id())));
      this.router.navigate(['/']);
    } catch (e) {
      this.deleteError.set(errorMessage(e));
    } finally {
      this.deleting.set(false);
    }
  }
}
