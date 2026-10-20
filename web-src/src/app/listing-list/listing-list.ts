import { Component, input, output } from '@angular/core';
import { Listing } from '../models/listing';
import { ListingCard } from '../listing-card/listing-card';

@Component({
  selector: 'app-listing-list',
  imports: [ListingCard],
  templateUrl: './listing-list.html',
  styleUrl: './listing-list.css',
})
export class ListingList {
  listings = input.required<Listing[]>();
  selectedId = input<number | null>(null);
  total = input<number>(0);
  selected = output<number>();
}
