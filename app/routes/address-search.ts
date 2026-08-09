import type { Route } from "./+types/address-search";

function fallbackAddress(value: string) {
  const parts = value.split(",").map((part) => part.trim()),
    stateZip = (parts[2] ?? "").match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  return {
    formatted: value,
    street: parts[0] ?? value,
    city: parts[1] ?? "",
    state: stateZip?.[1]?.toUpperCase() ?? "",
    zip: stateZip?.[2] ?? "",
    validated: false,
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 5) return { suggestions: [] };
  try {
    const url = new URL(
      "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
    );
    url.searchParams.set("address", query);
    url.searchParams.set("benchmark", "Public_AR_Current");
    url.searchParams.set("format", "json");
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Address service unavailable");
    const payload = (await response.json()) as {
        result?: {
          addressMatches?: Array<{
            matchedAddress: string;
            coordinates?: { x: number; y: number };
            addressComponents?: {
              fromAddress?: string;
              streetName?: string;
              suffixType?: string;
              city?: string;
              state?: string;
              zip?: string;
            };
          }>;
        };
      },
      matches = payload.result?.addressMatches ?? [];
    return {
      suggestions: matches.slice(0, 5).map((match) => {
        const component = match.addressComponents ?? {},
          street = [
            component.fromAddress,
            component.streetName,
            component.suffixType,
          ]
            .filter(Boolean)
            .join(" ");
        return {
          formatted: match.matchedAddress,
          street,
          city: component.city ?? "",
          state: component.state ?? "",
          zip: component.zip ?? "",
          longitude: match.coordinates?.x,
          latitude: match.coordinates?.y,
          validated: true,
        };
      }),
    };
  } catch {
    return { suggestions: [fallbackAddress(query)] };
  }
}
