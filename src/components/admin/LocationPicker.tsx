"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { LeafletMouseEvent } from "leaflet";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Loader2, MapPin, Navigation, Search } from "lucide-react";
import "leaflet/dist/leaflet.css";

type LocationPickerProps = {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (location: { label: string; latitude: number; longitude: number }) => void;
};

const DEFAULT_CENTER: [number, number] = [27.7172, 85.324];
const SEARCH_ZOOM = 17;

// Plain decimal degrees: "27.7172, 85.3240" or "27.7172 85.3240".
// Latitude first, as Google Maps copies them. No N/E suffixes or degree signs.
const COORDINATE_PATTERN = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*(?:,\s*|\s+)(-?\d{1,3}(?:\.\d+)?)\s*$/;

export function parseCoordinates(
  input: string,
): { latitude: number; longitude: number } | { error: string } {
  const match = COORDINATE_PATTERN.exec(input);
  if (!match) {
    return { error: "Enter latitude and longitude as numbers, e.g. 27.7172, 85.3240" };
  }
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (latitude < -90 || latitude > 90) {
    return { error: "Latitude must be between -90 and 90 (it comes first)." };
  }
  if (longitude < -180 || longitude > 180) {
    return { error: "Longitude must be between -180 and 180." };
  }
  return { latitude, longitude };
}

// Place search uses Photon (OpenStreetMap data, built for search-as-you-type).
// Nominatim's usage policy forbids autocomplete, so it's only used for the
// one-off reverse lookup when the map is clicked.
const PHOTON_URL = "https://photon.komoot.io/api/";
const NEPAL_BBOX = "80.05,26.34,88.21,30.45";
const MIN_QUERY_LENGTH = 3;
const SEARCH_DELAY_MS = 300;

type Place = { label: string; kind: string; latitude: number; longitude: number };

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
};

function toPlace({ geometry, properties: p }: PhotonFeature): Place {
  const parts = [p.name, p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street, p.district, p.city, p.county, p.state];
  const label = parts
    .filter((part): part is string => !!part)
    .filter((part, i, all) => all.indexOf(part) === i) // "Kathmandu, Kathmandu" → "Kathmandu"
    .join(", ");
  return {
    label: label || "Unnamed place",
    kind: (p.osm_value || p.type || "place").replace(/_/g, " "),
    latitude: geometry.coordinates[1],
    longitude: geometry.coordinates[0],
  };
}

async function searchPlaces(query: string, near: [number, number], signal: AbortSignal) {
  const params = new URLSearchParams({
    q: query,
    limit: "6",
    lang: "en",
    bbox: NEPAL_BBOX,
    lat: String(near[0]),
    lon: String(near[1]),
  });
  const response = await fetch(`${PHOTON_URL}?${params}`, { signal });
  if (!response.ok) throw new Error("Place search failed");
  const data = (await response.json()) as { features?: PhotonFeature[] };
  return (data.features || []).map(toPlace);
}

function MapView({ position, zoom }: { position: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, zoom ?? map.getZoom());
  }, [map, position, zoom]);
  return null;
}

function ClickHandler({
  onSelect,
}: {
  onSelect: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click: (event: LeafletMouseEvent) => onSelect(event.latlng.lat, event.latlng.lng),
  });
  return null;
}

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; places: Place[] };

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const hasInitial = typeof latitude === "number" && typeof longitude === "number";
  const [position, setPosition] = useState<[number, number]>(
    hasInitial ? [latitude, longitude] : DEFAULT_CENTER,
  );
  const [selected, setSelected] = useState(hasInitial);
  const [zoom, setZoom] = useState<number | undefined>(undefined);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [inputError, setInputError] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(position);
  positionRef.current = position;
  const listId = useId();

  const trimmed = query.trim();
  const coordinates = COORDINATE_PATTERN.test(trimmed) ? parseCoordinates(trimmed) : null;

  // Debounced place search; stale requests are cancelled as the admin types.
  useEffect(() => {
    if (coordinates || trimmed.length < MIN_QUERY_LENGTH) {
      setSearch({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    setSearch({ status: "loading" });
    const timer = setTimeout(() => {
      searchPlaces(trimmed, positionRef.current, controller.signal)
        .then((places) => {
          setSearch({ status: "done", places });
          setActive(0);
        })
        .catch((err: unknown) => {
          if ((err as Error).name !== "AbortError") setSearch({ status: "error" });
        });
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `coordinates` is derived from `trimmed`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const moveTo = (lat: number, lng: number, nextZoom?: number) => {
    setPosition([lat, lng]);
    setZoom(nextZoom);
    setSelected(true);
  };

  // Map click: look up the address for the clicked point.
  const selectPoint = async (lat: number, lng: number, nextZoom?: number) => {
    const fallbackLabel = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    moveTo(lat, lng, nextZoom);
    setReverseLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error("Location lookup failed");
      const data = (await response.json()) as { display_name?: string };
      onChange({ label: data.display_name || fallbackLabel, latitude: lat, longitude: lng });
    } catch {
      onChange({ label: fallbackLabel, latitude: lat, longitude: lng });
    } finally {
      setReverseLoading(false);
    }
  };

  const choosePlace = (place: Place) => {
    moveTo(place.latitude, place.longitude, SEARCH_ZOOM);
    onChange({ label: place.label, latitude: place.latitude, longitude: place.longitude });
    setQuery(place.label);
    setOpen(false);
  };

  const goToCoordinates = () => {
    if (!coordinates) return;
    if ("error" in coordinates) {
      setInputError(coordinates.error);
      return;
    }
    setOpen(false);
    void selectPoint(coordinates.latitude, coordinates.longitude, SEARCH_ZOOM);
  };

  const places = search.status === "done" ? search.places : [];
  const showList = open && (!!coordinates || trimmed.length >= MIN_QUERY_LENGTH);

  const submit = () => {
    if (coordinates) goToCoordinates();
    else if (places[active]) choosePlace(places[active]);
    else if (trimmed.length < MIN_QUERY_LENGTH) setInputError("Type at least 3 letters of a place name.");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && places.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % places.length);
    } else if (e.key === "ArrowUp" && places.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + places.length) % places.length);
    } else if (e.key === "Enter") {
      e.preventDefault(); // this picker sits inside other forms
      submit();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <div ref={wrapperRef} className="relative">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                if (inputError) setInputError("");
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Search a place (e.g. Ghattekulo) or paste coordinates (27.7172, 85.3240)"
              role="combobox"
              aria-label="Search location by place name or coordinates"
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={showList && places[active] ? `${listId}-${active}` : undefined}
              aria-invalid={!!inputError}
              autoComplete="off"
              className={`w-full rounded-lg border py-2 pl-9 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                inputError
                  ? "border-red-300 focus:ring-red-500"
                  : "border-slate-300 focus:ring-blue-500"
              }`}
            />
            {search.status === "loading" && (
              <Loader2
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
              />
            )}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!trimmed}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Go
          </button>
        </div>

        {showList && (
          // Above Leaflet's panes and controls (z-index up to 1000).
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-[1100] mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            {coordinates ? (
              "error" in coordinates ? (
                <li className="px-3 py-2 text-sm text-red-600">{coordinates.error}</li>
              ) : (
                <li role="option" aria-selected>
                  <button
                    type="button"
                    onClick={goToCoordinates}
                    className="flex w-full cursor-pointer items-center gap-2.5 bg-blue-50 px-3 py-2 text-left text-sm text-slate-900"
                  >
                    <Navigation size={15} className="shrink-0 text-blue-600" />
                    Go to {coordinates.latitude}, {coordinates.longitude}
                  </button>
                </li>
              )
            ) : search.status === "loading" ? (
              <li className="px-3 py-2 text-sm text-slate-500">Searching…</li>
            ) : search.status === "error" ? (
              <li className="px-3 py-2 text-sm text-slate-500">
                Couldn&apos;t search right now. Try again, or click the map.
              </li>
            ) : places.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">
                No places found. Try a nearby landmark, or paste coordinates.
              </li>
            ) : (
              places.map((place, i) => (
                <li key={`${place.label}-${i}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choosePlace(place)}
                    className={`flex w-full cursor-pointer items-start gap-2.5 px-3 py-2 text-left ${
                      i === active ? "bg-blue-50" : ""
                    }`}
                  >
                    <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-slate-900">{place.label}</span>
                      <span className="block text-xs capitalize text-slate-500">{place.kind}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
        {inputError && <p className="mt-1 text-xs text-red-600">{inputError}</p>}
      </div>

      <div className="h-64 overflow-hidden rounded-lg border border-slate-300">
        <MapContainer center={position} zoom={13} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapView position={position} zoom={zoom} />
          <ClickHandler onSelect={(lat, lng) => void selectPoint(lat, lng)} />
          {selected && (
            <CircleMarker
              center={position}
              radius={8}
              pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.8 }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-slate-500">
        {selected ? (
          <>
            Selected{" "}
            <span className="font-medium tabular-nums text-slate-700">
              {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </span>
            . Click the map to adjust.
          </>
        ) : (
          "Search above or click the map to pick the exact spot."
        )}
        {reverseLoading ? " Looking up address..." : ""}
      </p>
    </div>
  );
}
