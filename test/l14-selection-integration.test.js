const test = require('node:test');
const assert = require('node:assert/strict');

global.window = globalThis;
require('../scripts/s2geometry.js');
require('../scripts/l14-analysis.js');

const { S2 } = globalThis;
const { calculateL14Metrics, createSelectionController } = globalThis.S2L14Analysis;

function center(cell) {
  return cell.corners.reduce((point, corner) => ({
    lat: point.lat + corner.lat / 4,
    lng: point.lng + corner.lng / 4
  }), { lat: 0, lng: 0 });
}

test('selection changes update analysis metrics and empty-cell highlighting data', () => {
  const first = S2.getCellAtLatLng(40.7128, -74.0060, 14);
  const second = S2.getCellAtLatLng(51.5072, -0.1276, 14);
  const firstPoint = center(S2.getChildCells(first, 17)[0]);
  const secondPoint = center(S2.getChildCells(second, 17)[10]);
  const records = [
    { ...firstPoint, pokemonGoType: 'pokestop' },
    { ...secondPoint, pokemonGoType: 'gym' }
  ];
  const panelUpdates = [];
  const controller = createSelectionController(cell => {
    panelUpdates.push(cell ? calculateL14Metrics(cell, records, S2) : null);
  });

  controller.select(first);
  controller.select(second);

  assert.equal(panelUpdates[0].pokestopCount, 1);
  assert.equal(panelUpdates[0].gymCount, 0);
  assert.equal(panelUpdates[0].emptyL17Cells.length, 63);
  assert.equal(panelUpdates[1].pokestopCount, 0);
  assert.equal(panelUpdates[1].gymCount, 1);
  assert.equal(panelUpdates[1].emptyL17Cells.length, 63);
});

test('clicking a selected cell again clears the panel state', () => {
  const cell = S2.getCellAtLatLng(40.7128, -74.0060, 14);
  const panelUpdates = [];
  const controller = createSelectionController(selected => panelUpdates.push(selected));

  controller.select(cell);
  controller.select(cell);

  assert.equal(panelUpdates[0].key, cell.key);
  assert.equal(panelUpdates[1], null);
});
