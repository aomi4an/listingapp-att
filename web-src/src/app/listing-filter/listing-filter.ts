import { Component, input, output, signal } from '@angular/core';
import { ListingFilter as FilterValue, SortMode } from '../models/listing';

export interface DistrictOption { id: number; name: string; listingsCount: number; }

@Component({
  selector: 'app-listing-filter',
  templateUrl: './listing-filter.html',
  styleUrl: './listing-filter.css',
})
export class ListingFilter {
  districts = input.required<DistrictOption[]>();
  filterChange = output<FilterValue>();

  districtId = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  sort = signal<SortMode>('newest');
  onlyFavorites = signal(false);

  onDistrict(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.districtId.set(value === '' ? null : Number(value));
    this.emit();
  }

  onPrice(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.maxPrice.set(value === '' ? null : Number(value));
    this.emit();
  }

  onSort(event: Event) {
    this.sort.set((event.target as HTMLSelectElement).value as SortMode);
    this.emit();
  }

  onFavorites(event: Event) {
    this.onlyFavorites.set((event.target as HTMLInputElement).checked);
    this.emit();
  }

  reset() {
    this.districtId.set(null);
    this.maxPrice.set(null);
    this.sort.set('newest');
    this.onlyFavorites.set(false);
    this.emit();
  }

  private emit() {
    this.filterChange.emit({
      districtId: this.districtId(),
      maxPrice: this.maxPrice(),
      sort: this.sort(),
      onlyFavorites: this.onlyFavorites(),
    });
  }
}
