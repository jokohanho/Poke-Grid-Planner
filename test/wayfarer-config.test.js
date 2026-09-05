const test = require('node:test');
const assert = require('node:assert/strict');

require('../scripts/wayfarer-config.js');

const config = globalThis.S2Wayfarer;

test('Wayfarer configuration exposes the Scopely Mapview endpoint', () => {
  assert.equal(config.host, 'wayfarer.scopely.com');
  assert.equal(config.origin, 'https://wayfarer.scopely.com');
  assert.equal(config.mapPath, '/new/mapview');
  assert.equal(config.mapDataPath, '/api/v1/vault/mapview/gcs');
  assert.equal(config.matchPattern, '*://wayfarer.scopely.com/*');
  assert.equal(config.getMapUrl(), 'https://wayfarer.scopely.com/new/mapview');
});

test('isWayfarerUrl accepts only HTTPS URLs for the configured host', () => {
  assert.equal(config.isWayfarerUrl('https://wayfarer.scopely.com/'), true);
  assert.equal(config.isWayfarerUrl('https://wayfarer.scopely.com/new/mapview'), true);
  assert.equal(config.isWayfarerUrl('http://wayfarer.scopely.com/new/mapview'), false);
  assert.equal(config.isWayfarerUrl('https://wayfarer.scopely.com.evil.example/new/mapview'), false);
  assert.equal(config.isWayfarerUrl('not a URL'), false);
});

test('isWayfarerMapUrl accepts the map route and its query parameters', () => {
  assert.equal(config.isWayfarerMapUrl('https://wayfarer.scopely.com/new/mapview'), true);
  assert.equal(config.isWayfarerMapUrl('https://wayfarer.scopely.com/new/mapview?z=18'), true);
  assert.equal(config.isWayfarerMapUrl('https://wayfarer.scopely.com/new/mapview#filters'), true);
  assert.equal(config.isWayfarerMapUrl('https://wayfarer.scopely.com/new/mapview/'), false);
  assert.equal(config.isWayfarerMapUrl('https://wayfarer.scopely.com/review'), false);
});
