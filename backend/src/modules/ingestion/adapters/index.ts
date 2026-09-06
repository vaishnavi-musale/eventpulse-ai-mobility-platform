// §12.5 — adapter registry: pluggable by provider kind.
import {
  ProviderAdapterFactory,
  ProviderKind,
} from "../provider-adapter.interface";
import { metroAdapterFactory } from "./metro.adapter";
import { shuttleAdapterFactory } from "./shuttle.adapter";
import { hotelPmsAdapterFactory } from "./hotel-pms.adapter";
import { restaurantAdapterFactory } from "./restaurant.adapter";
import { venueAdapterFactory } from "./venue.adapter";

export const ADAPTER_FACTORIES: Record<ProviderKind, ProviderAdapterFactory> = {
  metro: metroAdapterFactory,
  shuttle: shuttleAdapterFactory,
  "hotel-pms": hotelPmsAdapterFactory,
  restaurant: restaurantAdapterFactory,
  venue: venueAdapterFactory,
};

export {
  metroAdapterFactory,
  shuttleAdapterFactory,
  hotelPmsAdapterFactory,
  restaurantAdapterFactory,
  venueAdapterFactory,
};
