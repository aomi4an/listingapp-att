import { Component, computed, inject, input, output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Listing } from '../models/listing';
import { Favorites } from '../services/favorites';

@Component({
  selector: 'app-listing-card',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './listing-card.html',
  styleUrl: './listing-card.css',
})
export class ListingCard {
  private favorites = inject(Favorites);

  listing = input.required<Listing>();
  active = input(false);
  selected = output<number>();

  isCheap = computed(() => this.listing().price < 40000);
  isNew = computed(() => Date.now() - new Date(this.listing().createdAt).getTime() < 7 * 24 * 3600 * 1000);
  isFavorite = computed(() => this.favorites.has(this.listing().id));
  roomsLabel = computed(() => {
    const r = this.listing().rooms;
    return r === 1 ? 'студия' : `${r} комн.`;
  });

  choose() {
    this.selected.emit(this.listing().id);
  }

  toggleFavorite() {
    this.favorites.toggle(this.listing().id);
  }
}
