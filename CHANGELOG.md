# Changelog

## 1.0.0 — Initial public release

Poke grid planner is a Manifest V3 Chrome extension for Pokémon GO players who plan Wayfarer nominations and in-game locations.

### Features

- Draws S2 Level 14 and Level 17 cell overlays on the Scopely Wayfarer map.
- Updates the overlay while the map moves and supports configurable cell colours.
- Lets players select an individual Level 14 area and inspect live map statistics.
- Reports Wayspots, active PokéStops, active Gyms, Power Spots, occupied Level 17 cells, and empty PokéStop slots when the Wayfarer map provides that data.
- Highlights empty Level 17 cells to support PokéStop and Gym planning.
- Shows an observed Gym-threshold estimate and clearly labels it as non-official game guidance.
- Preserves display preferences locally through the extension popup.

### Data and compatibility

- Uses the live Scopely Wayfarer map endpoint and geographic S2 containment for best-effort metrics.
- Keeps Wayspot counts separate from Pokémon GO locations and occupied Level 17 cells.
- Shows unavailable values instead of inventing data when the live endpoint does not provide a metric.
- Supports Chrome and other Chromium-based browsers with Manifest V3.

### Limitations

- Metrics depend on the current authenticated Wayfarer map response and may be incomplete, delayed, filtered, or changed by Wayfarer.
- Gym thresholds are community-observed estimates, not official guarantees.
- The extension is a read-only visual overlay and does not automate Wayfarer or Pokémon GO actions.
