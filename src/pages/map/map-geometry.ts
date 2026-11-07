import type { Boundaries } from "../../api/map";
import { labelPoint } from "./map-data";

export const VIEW_SIZE = 600;
const PADDING = 24;

export type DongShape = {
  dongCode: string;
  name: string;
  path: string;
  label: [number, number];
  bounds: [number, number, number, number];
  area: number;
};

function extent(values: number[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return [min, max];
}

function ringArea(ring: [number, number][]) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

export function toShapes(boundaries: Boundaries): DongShape[] {
  const points = boundaries.features.flatMap((feature) => feature.geometry.coordinates.flat(2));
  const [minLng, maxLng] = extent(points.map(([lng]) => lng));
  const [minLat, maxLat] = extent(points.map(([, lat]) => lat));

  const xScale = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const width = (maxLng - minLng) * xScale;
  const height = maxLat - minLat;
  const scale = (VIEW_SIZE - PADDING * 2) / Math.max(width, height);
  const offsetX = (VIEW_SIZE - width * scale) / 2;
  const offsetY = (VIEW_SIZE - height * scale) / 2;

  const project = ([lng, lat]: number[]): [number, number] => [
    (lng - minLng) * xScale * scale + offsetX,
    (maxLat - lat) * scale + offsetY,
  ];

  return boundaries.features.map((feature) => {
    const rings = feature.geometry.coordinates.flat().map((ring) => ring.map(project));
    const [minX, maxX] = extent(rings.flat().map(([x]) => x));
    const [minY, maxY] = extent(rings.flat().map(([, y]) => y));
    const path = rings
      .map((ring) => `M${ring.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L")}Z`)
      .join("");

    return {
      dongCode: feature.properties.dongCode,
      name: feature.properties.name,
      path,
      label: project(labelPoint(feature)),
      bounds: [minX, minY, maxX, maxY],
      area: rings.reduce((sum, ring) => sum + ringArea(ring), 0),
    };
  });
}
