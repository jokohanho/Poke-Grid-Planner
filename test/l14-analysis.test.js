const test = require('node:test');
const assert = require('node:assert/strict');

global.window = globalThis;
require('../scripts/s2geometry.js');
require('../scripts/l14-analysis.js');

const { S2 } = globalThis;
const { calculateL14Metrics, createSelectionController, isSameCell, normalizeWayfarerMapData } = globalThis.S2L14Analysis;

function center(cell) {
  return cell.corners.reduce((point, corner) => ({
    lat: point.lat + corner.lat / cell.corners.length,
    lng: point.lng + corner.lng / cell.corners.length
  }), { lat: 0, lng: 0 });
}

function selectedCell() {
  return S2.getCellAtLatLng(40.7128, -74.0060, 14);
}

function recordInChild(childIndex, properties = {}) {
  return { ...center(S2.getChildCells(selectedCell(), 17)[childIndex]), ...properties };
}

test('an empty L14 has 64 empty PokéStop slots', () => {
  const metrics = calculateL14Metrics(selectedCell(), [], S2);
  assert.equal(metrics.wayspotCount, 0);
  assert.equal(metrics.pokestopCount, 0);
  assert.equal(metrics.gymCount, 0);
  assert.equal(metrics.powerSpotCount, 0);
  assert.equal(metrics.occupiedL17Count, 0);
  assert.equal(metrics.emptyL17Count, 64);
});

test('every L14 resolves to exactly 64 L17 children', () => {
  const l14 = selectedCell();
  const children = S2.getChildCells(l14, 17);
  assert.equal(children.length, 64);
  assert.equal(new Set(children.map(child => child.key)).size, 64);
  assert.ok(children.every(child => isSameCell(S2.getCellAtLatLng(center(child).lat, center(child).lng, 14), l14)));
});

test('one active Pokémon GO location occupies one L17 cell', () => {
  const metrics = calculateL14Metrics(selectedCell(), [recordInChild(0, { pokemonGoType: 'pokestop' })], S2);
  assert.equal(metrics.occupiedL17Count, 1);
  assert.equal(metrics.emptyL17Count, 63);
  assert.equal(metrics.emptyL17Count, 64 - metrics.occupiedL17Count);
});

test('multiple Wayspots in one L17 count once as an occupied slot', () => {
  const child = S2.getChildCells(selectedCell(), 17)[2];
  const point = center(child);
  const records = [
    { ...point, pokemonGoType: 'pokestop' },
    { lat: point.lat + 0.000001, lng: point.lng + 0.000001 },
    { lat: point.lat - 0.000001, lng: point.lng - 0.000001, powerSpot: true }
  ];
  const metrics = calculateL14Metrics(selectedCell(), records, S2);
  assert.equal(metrics.wayspotCount, 3);
  assert.equal(metrics.occupiedL17Count, 1);
  assert.equal(metrics.powerSpotCount, 1);
});

test('PokéStops and Gyms are classified and occupy unique L17 cells', () => {
  const metrics = calculateL14Metrics(selectedCell(), [
    recordInChild(4, { pokemonGoType: 'pokestop' }),
    recordInChild(18, { pokemonGoType: 'gym' }),
    recordInChild(30, { powerSpot: true })
  ], S2);
  assert.equal(metrics.pokestopCount, 1);
  assert.equal(metrics.gymCount, 1);
  assert.equal(metrics.powerSpotCount, 1);
  assert.equal(metrics.occupiedL17Count, 2);
  assert.equal(metrics.emptyL17Count, 62);
});

test('records outside the selected L14 do not affect metrics', () => {
  const metrics = calculateL14Metrics(selectedCell(), [
    recordInChild(5, { pokemonGoType: 'pokestop' }),
    { lat: -33.8688, lng: 151.2093, pokemonGoType: 'gym', powerSpot: true }
  ], S2);
  assert.equal(metrics.wayspotCount, 1);
  assert.equal(metrics.gymCount, 0);
  assert.equal(metrics.powerSpotCount, 0);
  assert.equal(metrics.occupiedL17Count, 1);
});

test('cell membership is assigned from S2 geography, including near cell boundaries', () => {
  const l14 = selectedCell();
  const child = S2.getChildCells(l14, 17)[63];
  const middle = center(child);
  const boundary = child.corners[0];
  // Deliberately stay just inside one corner rather than using a pixel position.
  const point = {
    lat: boundary.lat * 0.999999 + middle.lat * 0.000001,
    lng: boundary.lng * 0.999999 + middle.lng * 0.000001
  };
  const metrics = calculateL14Metrics(l14, [{ lat: point.lat, lng: point.lng, pokemonGoType: 'gym' }], S2);
  assert.equal(metrics.gymCount, 1);
  assert.equal(metrics.occupiedL17Count, 1);
});

test('selection controller selects, changes, and deselects an L14 cell', () => {
  const changes = [];
  const controller = createSelectionController(cell => changes.push(cell && cell.key));
  const first = selectedCell();
  const second = S2.getCellAtLatLng(51.5072, -0.1276, 14);
  controller.select(first);
  controller.select(second);
  controller.select(second);
  assert.equal(controller.getSelectedCell(), null);
  assert.deepEqual(changes, [first.key, second.key, null]);
});

test('missing map records are explicitly unavailable rather than treated as zero', () => {
  const metrics = calculateL14Metrics(selectedCell(), null, S2);
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.wayspotCount, null);
  assert.equal(metrics.emptyL17Count, null);
});

test('normalizes the Wayfarer gcs POI response and preserves active game types', () => {
  const records = normalizeWayfarerMapData({ result: { data: [{ pois: [
    { poiId: 'stop', latE6: 22656237, lngE6: 88387204, gmo: [{ entity: 'POKESTOP', status: 'ACTIVE' }] },
    { poiId: 'gym', latE6: 22653606, lngE6: 88387481, gmo: [{ entity: 'GYM', status: 'ACTIVE' }] },
    { poiId: 'power', latE6: 22656349, lngE6: 88387397, gmo: [{ entity: 'POWERSPOT', status: 'ACTIVE' }] },
    { poiId: 'inactive', latE6: 22657000, lngE6: 88388000, gmo: [{ entity: 'GYM', status: 'REMOVED' }] }
  ] }] } });
  assert.equal(records.length, 4);
  assert.deepEqual(records[0].pokemonGoTypes, ['pokestop']);
  assert.deepEqual(records[1].pokemonGoTypes, ['gym']);
  assert.equal(records[2].powerSpot, true);
  assert.deepEqual(records[3].pokemonGoTypes, []);
  assert.equal(records[3].powerSpot, false);
});
