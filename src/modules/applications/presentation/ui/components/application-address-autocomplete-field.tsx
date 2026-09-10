"use client";

import { useEffect, useRef, useState } from "react";
import type { FieldPath } from "react-hook-form";
import {
  ADDRESS_AUTOCOMPLETE_MIN_LENGTH,
} from "../../../application/validation/address-autocomplete-schema";
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
  const [suggestions, setSuggestions] = useState<
    readonly AddressSuggestion[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const suggestionsRef = useRef(suggestions);
  suggestionsRef.current = suggestions;

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < ADDRESS_AUTOCOMPLETE_MIN_LENGTH) {
      setSuggestions([]);
      setIsLoading(false);
      setLoadFailed(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setLoadFailed(false);
    const timeout = setTimeout(() => {
      void search(token, normalizedQuery, { signal: controller.signal })
        .then((result) => {
          if (!controller.signal.aborted) setSuggestions(result);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
            setLoadFailed(true);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, AUTOCOMPLETE_DELAY_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, search, token]);

  const handleInputValueChange = (value: string) => {
    if (suggestionsRef.current.some((suggestion) => suggestion.value === value)) {
      setQuery("");
      return;
    }
    setSuggestions([]);
    setQuery(value);
  };

  const emptyMessage = isLoading
    ? "Đang tìm địa chỉ..."
    : query.trim().length < ADDRESS_AUTOCOMPLETE_MIN_LENGTH
      ? `Nhập ít nhất ${ADDRESS_AUTOCOMPLETE_MIN_LENGTH} ký tự để tìm địa chỉ.`
      : "Không tìm thấy địa chỉ phù hợp.";

  return (
    <ApplicationComboboxField
      name={name}
      autoComplete={autoComplete}
      label={label}
      description={
        loadFailed
          ? "Không tải được gợi ý địa chỉ. Bạn vẫn có thể nhập tay."
          : undefined
      }
      emptyMessage={emptyMessage}
      maxLength={WORD_EXPORT_TEXT_LIMITS.permanentAddress}
      onInputValueChange={handleInputValueChange}
      options={suggestions}
      placeholder="Nhập để tìm địa chỉ"
      required
    />
  );
}
