import { validateRegistrationLink } from "@/composition/registration-links";
import { searchLocalAddresses } from "@/modules/applications/infrastructure/local-address-autocomplete";
import { createAddressAutocompleteHandler } from "@/modules/applications/presentation/http/address-autocomplete-handler";

export const runtime = "nodejs";

export const POST = createAddressAutocompleteHandler(
  searchLocalAddresses,
  validateRegistrationLink,
);
