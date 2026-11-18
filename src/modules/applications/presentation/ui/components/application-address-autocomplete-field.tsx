"use client";

import { useEffect, useState } from "react";
import type { FieldPath } from "react-hook-form";
import { ADDRESS_AUTOCOMPLETE_MIN_LENGTH } from "../../../application/validation/address-autocomplete-schema";
import { WORD_EXPORT_TEXT_LIMITS } from "../../../application/validation/application-schemas";
import {
  searchAddressSuggestions,
  type AddressSuggestion,
} from "../application-api-client";
import type { ApplicationFormValues } from "../application-form.types";
import { ApplicationComboboxField } from "./application-field";

const AUTOCOMPLETE_DELAY_MS = 300;

type AddressSearch = (
  token: string,
  query: string,
  options?: { readonly signal?: AbortSignal },
) => Promise<readonly AddressSuggestion[]>;

interface AddressSearchResult {
  readonly query: string;
  readonly suggestions: readonly AddressSuggestion[];
  readonly failed: boolean;
}

export function ApplicationAddressAutocompleteField({
  autoComplete,
  label,
  name,
  search = searchAddressSuggestions,
  token,
}: {
  readonly autoComplete: string;
  readonly label: string;
  readonly name: FieldPath<ApplicationFormValues>;
  readonly search?: AddressSearch;
  readonly token: string;
}) {
  const [query, setQuery] = useState("");
  const [lastSearch, setLastSearch] = useState<AddressSearchResult | null>(
    null,
  );

  // Everything below is derived from the current query: a result only counts
  // for the query it was fetched for, otherwise the search is still running.
  const normalizedQuery = query.trim();
  const isSearchable =
    normalizedQuery.length >= ADDRESS_AUTOCOMPLETE_MIN_LENGTH;
  const currentSearch =
    isSearchable && lastSearch?.query === normalizedQuery ? lastSearch : null;
  const isLoading = isSearchable && currentSearch === null;
  const suggestions = currentSearch?.suggestions ?? [];
  const loadFailed = currentSearch?.failed ?? false;

  useEffect(() => {
    if (!isSearchable) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      search(token, normalizedQuery, { signal: controller.signal }).then(
        (result) => {
          if (!controller.signal.aborted) {
            setLastSearch({
              query: normalizedQuery,
              suggestions: result,
              failed: false,
            });
          }
        },
        () => {
          if (!controller.signal.aborted) {
            setLastSearch({
              query: normalizedQuery,
              suggestions: [],
              failed: true,
            });
          }
        },
      );
    }, AUTOCOMPLETE_DELAY_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [isSearchable, normalizedQuery, search, token]);

  const handleInputValueChange = (value: string) => {
    // Picking a suggestion fills the input; that must not start a new search.
    if (suggestions.some((suggestion) => suggestion.value === value)) {
      setQuery("");
      return;
    }
    setQuery(value);
  };

  const emptyMessage = isLoading
    ? "Đang tìm địa chỉ..."
    : !isSearchable
      ? `Nhập ít nhất ${ADDRESS_AUTOCOMPLETE_MIN_LENGTH} ký tự để tìm địa chỉ.`
      : "Không tìm thấy xã/phường phù hợp. Bạn vẫn có thể nhập tay.";

  return (
    <ApplicationComboboxField
      name={name}
      autoComplete={autoComplete}
      label={label}
      description={
        loadFailed
          ? "Không tải được gợi ý địa chỉ. Bạn vẫn có thể nhập tay."
          : "Nhập số nhà, tên đường, dấu phẩy rồi tên xã/phường để chọn địa chỉ gợi ý."
      }
      emptyMessage={emptyMessage}
      maxLength={WORD_EXPORT_TEXT_LIMITS.permanentAddress}
      onInputValueChange={handleInputValueChange}
      options={suggestions}
      placeholder="Ví dụ: 126 Nguyễn Thiện Thành, Hòa Thuận"
      required
    />
  );
}
