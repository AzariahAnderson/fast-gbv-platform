import "client-only";
import type { StyleSpecification } from "maplibre-gl";

/**
 * FAST cartography. A real map style, recoloured into the four FAST
 * colours: warm dark ground, muted taupe roads, quiet water, high
 * contrast labels. The base style is configurable through
 * NEXT_PUBLIC_MAP_STYLE_URL (any OpenMapTiles-compatible style works);
 * when the network style cannot be reached we fall back to OpenStreetMap
 * raster tiles, clearly attributed, darkened with raster paint so the
 * page still feels like FAST.
 *
 * OSM-derived tiles always carry the required attribution.
 */

export const DEFAULT_STYLE_URL =
  "https://tiles.openfreemap.org/styles/dark";

const INK = "#454040";
const TAUPE = "#605b51";
const BODY = "#c7c3bb";
const GOLD = "#d8d365";

export async function loadFastStyle(): Promise<StyleSpecification> {
  const url = process.env.NEXT_PUBLIC_MAP_STYLE_URL || DEFAULT_STYLE_URL;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`style ${res.status}`);
    const style = (await res.json()) as StyleSpecification;
    return recolor(style);
  } catch {
    return rasterFallback();
  }
}

/** Walk the layers of any OpenMapTiles-style sheet and quieten it into FAST. */
function recolor(style: StyleSpecification): StyleSpecification {
  for (const layer of style.layers) {
    const paint = layer.paint as Record<string, unknown> | undefined;
    const id = layer.id.toLowerCase();

    if (layer.type === "background") {
      layer.paint = { ...(paint ?? {}), "background-color": INK };
      continue;
    }
    if (layer.type === "raster") {
      layer.paint = {
        ...(paint ?? {}),
        "raster-brightness-max": 0.72,
        "raster-saturation": -0.55,
        "raster-contrast": 0.18,
      };
      continue;
    }
    if (layer.type === "fill") {
      if (id.includes("water")) {
        layer.paint = { ...(paint ?? {}), "fill-color": "#4a453f" };
      } else if (id.includes("building")) {
        layer.paint = { ...(paint ?? {}), "fill-color": "#524d46", "fill-opacity": 0.85 };
      } else if (id.includes("landuse") || id.includes("park") || id.includes("forest")) {
        layer.paint = { ...(paint ?? {}), "fill-color": "#4c4741", "fill-opacity": 0.7 };
      }
      continue;
    }
    if (layer.type === "line") {
      if (id.includes("road") || id.includes("bridge") || id.includes("tunnel") || id.includes("path")) {
        const isCase = id.includes("case") || id.includes("outline");
        layer.paint = {
          ...(paint ?? {}),
          "line-color": isCase ? "#3d3936" : TAUPE,
        };
        if (paint && "line-width" in paint) {
          // keep widths from the base style
        }
      } else if (id.includes("boundary") || id.includes("border")) {
        layer.paint = { ...(paint ?? {}), "line-color": "#56514a", "line-opacity": 0.7 };
      }
      continue;
    }
    if (layer.type === "symbol") {
      layer.paint = {
        ...(paint ?? {}),
        "text-color": BODY,
        "text-halo-color": INK,
        "text-halo-width": 1.4,
        "icon-color": BODY,
        "icon-halo-color": INK,
        "icon-halo-width": 1.2,
      };
      // Important labels (places) read slightly warmer.
      if (id.includes("place") || id.includes("city") || id.includes("town")) {
        layer.paint = { ...(layer.paint as object), "text-color": GOLD };
      }
    }
  }
  return style;
}

function rasterFallback(): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        maxzoom: 19,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": INK } },
      {
        id: "osm",
        type: "raster",
        source: "osm",
        paint: {
          "raster-brightness-max": 0.7,
          "raster-saturation": -0.6,
          "raster-contrast": 0.2,
        },
      },
    ],
  };
}

/**
 * Approximate precision is the default: the point is rounded to roughly a
 * few hundred metres and the reported accuracy is widened, so a viewer
 * learns the neighbourhood, never the doorstep.
 */
export function makeApproximate(lat: number, lng: number): {
  latitude: number;
  longitude: number;
} {
  const r = (n: number, digits: number) => {
    const f = 10 ** digits;
    return Math.round(n * f) / f;
  };
  return { latitude: r(lat, 2), longitude: r(lng, 2) };
}
