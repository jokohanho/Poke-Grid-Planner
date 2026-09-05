# L14 Cell Analysis & Gym Planning — Product Requirements

## 1. Product goal

Pokémon GO players using the Scopely Wayfarer Map can select one Level 14 area and understand the Wayspots and active Pokémon GO locations inside it. The feature is intended for planning and exploration; it is not an official Pokémon GO or Wayfarer rules engine.

The primary UI uses player-facing terms. S2/L14/L17 identifiers are available only as technical details.

## 2. Existing extension context

The extension is a Manifest V3 Chrome extension that:

- draws Level 14 and Level 17 S2 boundaries over the Wayfarer Map;
- obtains Google Maps bounds and click events through a MAIN-world Angular/Google Maps bridge;
- keeps rendering and analysis separate from the popup and nomination tools;
- performs all calculations locally after data is received from Wayfarer.

The runtime website configuration lives in `scripts/wayfarer-config.js`. The static manifest still contains the required Chrome host patterns.

## 3. User flow

1. Open the extension popup on `https://wayfarer.scopely.com/new/mapview`.
2. Choose **Analyze map area**.
3. Click an L14 area on the map.
4. The selected cell receives a stronger gold outline and subtle fill.
5. A compact panel displays the metrics for that area.
6. Click another area to replace the selection.
7. Click the selected area again, press Escape, or close the panel to clear it.

Analysis mode is explicit so normal map panning, zooming, and Wayspot interaction remain unchanged when the feature is not being used.

## 4. Data source

The current Wayfarer Map makes an authenticated same-origin request:

```text
GET /api/v1/vault/mapview/gcs
  ?ne=(northEastLatitude,northEastLongitude)
  &sw=(southWestLatitude,southWestLongitude)
  &cellLevel=14
```

The response observed in the captured Mapview traffic has this relevant shape:

```json
{
  "result": {
    "data": [
      {
        "metadata": {
          "s2CellLevel": 14,
          "s2CellId": "...",
          "count": 23,
          "format": "DETAILED"
        },
        "pois": [
          {
            "poiId": "...",
            "latE6": 22656237,
            "lngE6": 88387204,
            "gmo": [
              { "entity": "POKESTOP", "status": "ACTIVE" }
            ]
          }
        ]
      }
    ],
    "cellLevel": 14
  }
}
```

The bridge performs the request in the page’s MAIN world with `credentials: 'include'`, allowing the browser’s existing authenticated session to be used. It requests the current viewport on map idle and requests the selected L14 bounding box after selection.

No cookies, CSRF tokens, API keys, or HAR files are stored by the extension.

## 5. Metric definitions

The adapter converts each returned POI into one Wayspot record. `latE6` and `lngE6` are divided by one million. Only `gmo` entries whose status is `ACTIVE` are classified.

### Wayspots

Count of POIs whose coordinates fall inside the selected L14 according to the shared geographic S2 implementation. A POI with no active `gmo` entry still counts as a Wayspot.

### PokéStops

Count of selected-cell POIs with an active `gmo` entity of `POKESTOP`.

### Gyms

Count of selected-cell POIs with an active `gmo` entity of `GYM`.

### Power Spots

Count of selected-cell POIs with an active `gmo` entity of `POWERSPOT`.

### Occupied L17 cells

For every selected-cell POI with an active `POKESTOP` or `GYM`, calculate its geographic Level 17 S2 cell. A set of L17 cell keys removes duplicates, so multiple Wayspots in the same L17 count as one occupied location.

### Empty PokéStop Slots

One L14 contains exactly 64 L17 children. Therefore:

```text
empty L17 cells = 64 - unique occupied L17 cells
```

Wayspot count is never substituted for occupied-L17 count.

## 6. Gym planning guidance

The analyzer keeps observed community thresholds centralized as:

```js
[2, 6, 20]
```

The UI labels any progress message **Observed Gym threshold**. These values are planning guidance, not guaranteed official Pokémon GO mechanics, and can be changed in one place if game behavior changes.

## 7. Architecture

```text
Wayfarer Map
    ↓ authenticated /gcs response
MAIN-world bridge (bridge.js)
    ↓ CustomEvent map-data
POI adapter (l14-analysis.js)
    ↓ normalized records
S2 geographic membership + L14 analyzer
    ↓ structured metrics
Content-script selection state and panel
    ↓
Selected-cell highlight / optional empty-L17 highlight
```

Relevant boundaries:

- `scripts/bridge.js`: fetches Wayfarer map data and relays it; it does not render or count.
- `scripts/l14-analysis.js`: normalizes POIs, classifies active game entities, resolves 64 child cells, calculates metrics, and owns selection state helpers.
- `scripts/s2geometry.js`: supplies geographic S2 cell conversion and child-cell generation.
- `scripts/content.js`: handles map selection, panel updates, and visual state.

## 8. Best-effort reliability model

The feature is reliable relative to the data returned by the authenticated Wayfarer API at analysis time. It is not possible to promise 100% permanent accuracy because the endpoint is private and undocumented.

The implementation improves confidence by:

- querying the selected L14 bounds directly rather than relying only on the visible viewport;
- using coordinates and geographic S2 containment instead of screen pixels;
- deduplicating occupied L17 cells;
- requiring `status: "ACTIVE"` for game classifications;
- preserving Wayspots with no active game entity;
- treating unavailable or malformed data as unavailable instead of zero;
- keeping API parsing isolated in one adapter;
- testing the observed response schema and all metric edge cases.

Results can still differ from the live game when data is stale, the API response is partial, a request fails, Wayfarer changes its schema, or game synchronization has not completed.

## 9. Failure behavior

If the endpoint fails or does not match the expected schema:

- the selected cell remains visible;
- the panel displays `—` for metrics;
- empty-cell highlighting is disabled;
- no inferred or fabricated values are shown.

## 10. Testing requirements

`npm run check` validates:

- Manifest V3 structure and script ordering;
- JavaScript parsing;
- URL configuration;
- exact 64-child L14/L17 relationships;
- empty and occupied-cell calculations;
- duplicate Wayspots in one L17;
- PokéStop/Gym/Power Spot classification;
- geographic exclusion of outside records;
- near-boundary membership;
- selection, replacement, and deselection;
- normalization of the observed `/gcs` response shape.

Browser testing is still required for authenticated Mapview behavior, API availability, and visual interaction after Wayfarer releases.

## 11. Explicit non-goals

- No unofficial inference of hidden or future locations.
- No guarantee that community Gym thresholds are official.
- No scraping of private user data.
- No automation of Wayfarer nominations or reviews.
- No dependency on Google Maps tile pixels for metric membership.
