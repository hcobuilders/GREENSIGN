import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

export type StructuredAddress = {
  formatted: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  validated?: boolean;
  latitude?: number;
  longitude?: number;
};
type AddressResult = { suggestions: StructuredAddress[] };

export function AddressField({
  value,
  onChange,
  label = "ADDRESS",
  required = false,
  submitFields = true,
}: {
  value?: Partial<StructuredAddress> | string;
  onChange?: (address: StructuredAddress) => void;
  label?: string;
  required?: boolean;
  submitFields?: boolean;
}) {
  const initial =
    typeof value === "string"
      ? { formatted: value, street: "", city: "", state: "", zip: "" }
      : {
          formatted: value?.formatted ?? "",
          street: value?.street ?? "",
          city: value?.city ?? "",
          state: value?.state ?? "",
          zip: value?.zip ?? "",
        };
  const fetcher = useFetcher<AddressResult>(),
    [address, setAddress] = useState<StructuredAddress>(initial),
    [open, setOpen] = useState(false),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    if (address.formatted.trim().length < 5) {
      setOpen(false);
      return;
    }
    const timer = window.setTimeout(() => {
      fetcher.load(`/api/address?q=${encodeURIComponent(address.formatted)}`);
      setOpen(true);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [address.formatted, dirty]);
  function select(next: StructuredAddress) {
    setAddress(next);
    setOpen(false);
    setDirty(false);
    onChange?.(next);
  }
  function updatePart(key: "street" | "city" | "state" | "zip", value: string) {
    const parts = { ...address, [key]: value, validated: false },
      next = {
        ...parts,
        formatted: [parts.street, parts.city, parts.state, parts.zip]
          .filter(Boolean)
          .join(", "),
      };
    setAddress(next);
    setDirty(true);
    onChange?.(next);
  }
  return (
    <div className="address-field">
      <label>
        {label}
        <input
          name={submitFields ? "location" : undefined}
          autoComplete="street-address"
          required={required}
          value={address.formatted}
          onChange={(event) => {
            const next = {
              ...address,
              formatted: event.target.value,
              validated: false,
            };
            setAddress(next);
            setDirty(true);
            onChange?.(next);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        />
      </label>
      {open && (
        <div className="address-suggestions">
          {fetcher.state !== "idle" && <span>VALIDATING ADDRESS…</span>}
          {fetcher.data?.suggestions.map((item) => (
            <button
              type="button"
              key={item.formatted}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(item)}
            >
              <b>{item.formatted}</b>
              <small>
                {item.validated ? "U.S. CENSUS MATCH" : "USE ENTERED ADDRESS"}
              </small>
            </button>
          ))}
        </div>
      )}
      <div className="address-parts">
        <input
          name={submitFields ? "street" : undefined}
          aria-label={`${label} street`}
          placeholder="Street"
          value={address.street}
          onChange={(event) => updatePart("street", event.target.value)}
        />
        <input
          name={submitFields ? "city" : undefined}
          aria-label={`${label} city`}
          placeholder="City"
          value={address.city}
          onChange={(event) => updatePart("city", event.target.value)}
        />
        <input
          name={submitFields ? "addressState" : undefined}
          aria-label={`${label} state`}
          placeholder="State"
          maxLength={2}
          value={address.state}
          onChange={(event) =>
            updatePart("state", event.target.value.toUpperCase())
          }
        />
        <input
          name={submitFields ? "zip" : undefined}
          aria-label={`${label} ZIP`}
          placeholder="ZIP"
          value={address.zip}
          onChange={(event) => updatePart("zip", event.target.value)}
        />
      </div>
    </div>
  );
}

export function formatAddress(value: unknown, fallback = "Address not set") {
  if (typeof value === "string") return value || fallback;
  const address = (value ?? {}) as Partial<StructuredAddress>;
  return (
    address.formatted ||
    [address.street, address.city, address.state, address.zip]
      .filter(Boolean)
      .join(", ") ||
    fallback
  );
}
