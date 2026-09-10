import { validateRegistrationLink } from "@/composition/registration-links";
import { searchVietmapAddresses } from "@/modules/applications/infrastructure/vietmap-address-autocomplete";
import { createAddressAutocompleteHandler } from "@/modules/applications/presentation/http/address-autocomplete-handler";

export const runtime = "nodejs";

export const POST = createAddressAutocompleteHandler(
  searchVietmapAddresses,
  validateRegistrationLink,
);
