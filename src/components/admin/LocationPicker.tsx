"use client";

import { useEffect, useState } from "react";
import type { LeafletMouseEvent } from "leaflet";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type LocationPickerProps = {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (location: { label: string; latitude: number; longitude: number }) => void;
};

const DEFAULT_CENTER: [number, number] = [27.7172, 85.324];

function MapCenter({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position);
  }, [map, position]);
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

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const initialPosition: [number, number] =
    typeof latitude === "number" && typeof longitude === "number"
      ? [latitude, longitude]
      : DEFAULT_CENTER;
  const [position, setPosition] = useState(initialPosition);
  const [loading, setLoading] = useState(false);

  const selectPosition = async (nextLatitude: number, nextLongitude: number) => {
    const nextPosition: [number, number] = [nextLatitude, nextLongitude];
    setPosition(nextPosition);
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${nextLatitude}&lon=${nextLongitude}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error("Location lookup failed");
      const data = (await response.json()) as { display_name?: string };
      onChange({
        label: data.display_name || `${nextLatitude.toFixed(6)}, ${nextLongitude.toFixed(6)}`,
        latitude: nextLatitude,
        longitude: nextLongitude,
      });
    } catch {
      onChange({
        label: `${nextLatitude.toFixed(6)}, ${nextLongitude.toFixed(6)}`,
        latitude: nextLatitude,
        longitude: nextLongitude,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="h-64 overflow-hidden rounded-lg border border-slate-300">
        <MapContainer center={position} zoom={13} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapCenter position={position} />
          <ClickHandler onSelect={selectPosition} />
          <CircleMarker center={position} radius={8} pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.8 }} />
        </MapContainer>
      </div>
      <p className="text-xs text-slate-500">
        Click the map to select the exact location.{loading ? " Looking up address..." : ""}
      </p>
    </div>
  );
}
