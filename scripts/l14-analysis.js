// Analysis is intentionally independent of map DOM and rendering. A caller
// supplies only verified Wayfarer records; null means map data is unavailable.
(function (global) {
  'use strict';

  const GYM_THRESHOLDS = Object.freeze([2, 6, 20]);

  function isSameCell(a, b) {
    return !!a && !!b && a.level === b.level && a.face === b.face && a.i === b.i && a.j === b.j;
  }

  function getRecordCell(record, level, s2) {
    if (!record || !Number.isFinite(record.lat) || !Number.isFinite(record.lng)) return null;
    return s2.getCellAtLatLng(record.lat, record.lng, level);
  }

  function getRecordsInL14(l14Cell, records, s2) {
    if (!Array.isArray(records)) return [];
    return records.filter(record => isSameCell(getRecordCell(record, 14, s2), l14Cell));
  }

  function getObservedGymProgress(occupiedL17Count) {
    const nextThreshold = GYM_THRESHOLDS.find(threshold => occupiedL17Count < threshold) || null;
    return {
      thresholds: GYM_THRESHOLDS,
      nextThreshold,
      remaining: nextThreshold == null ? 0 : nextThreshold - occupiedL17Count
    };
  }

  function hasGameType(record, type) {
    return record && (record.pokemonGoType === type ||
      (Array.isArray(record.pokemonGoTypes) && record.pokemonGoTypes.includes(type)));
  }

  // Adapter for /api/v1/vault/mapview/gcs responses. One record represents one
  // Wayspot; active game entities are retained as classifications on it.
  function normalizeWayfarerMapData(payload) {
    const groups = Array.isArray(payload) ? payload : payload && payload.result && payload.result.data;
    if (!Array.isArray(groups)) return null;
    const records = [];
    for (const group of groups) {
      for (const poi of (group && Array.isArray(group.pois) ? group.pois : [])) {
        const activeTypes = (Array.isArray(poi.gmo) ? poi.gmo : [])
          .filter(gameObject => gameObject && gameObject.status === 'ACTIVE')
          .map(gameObject => String(gameObject.entity || '').toLowerCase())
          .filter(entity => entity === 'pokestop' || entity === 'gym' || entity === 'powerspot');
        records.push({
          id: poi.poiId,
          lat: Number(poi.latE6) / 1e6,
          lng: Number(poi.lngE6) / 1e6,
          pokemonGoTypes: activeTypes.filter(type => type === 'pokestop' || type === 'gym'),
          powerSpot: activeTypes.includes('powerspot')
        });
      }
    }
    return records;
  }

  function calculateL14Metrics(l14Cell, records, s2) {
    const l17Cells = s2.getChildCells(l14Cell, 17);
    if (!Array.isArray(records)) {
      return {
        l14Cell,
        l17Cells,
        dataAvailable: false,
        wayspotCount: null,
        pokestopCount: null,
        gymCount: null,
        powerSpotCount: null,
        occupiedL17Count: null,
        emptyL17Count: null,
        emptyL17Cells: [],
        gymProgress: null
      };
    }

    const recordsInL14 = getRecordsInL14(l14Cell, records, s2);
    const occupiedL17Keys = new Set();
    let pokestopCount = 0;
    let gymCount = 0;
    let powerSpotCount = 0;

    for (const record of recordsInL14) {
      if (hasGameType(record, 'pokestop') || hasGameType(record, 'gym')) {
        const l17Cell = getRecordCell(record, 17, s2);
        if (l17Cell) occupiedL17Keys.add(l17Cell.key);
      }
      if (hasGameType(record, 'pokestop')) pokestopCount++;
      if (hasGameType(record, 'gym')) gymCount++;
      if (record.powerSpot === true) powerSpotCount++;
    }

    const emptyL17Cells = l17Cells.filter(cell => !occupiedL17Keys.has(cell.key));
    return {
      l14Cell,
      l17Cells,
      dataAvailable: true,
      wayspotCount: recordsInL14.length,
      pokestopCount,
      gymCount,
      powerSpotCount,
      occupiedL17Count: occupiedL17Keys.size,
      emptyL17Count: emptyL17Cells.length,
      emptyL17Cells,
      gymProgress: getObservedGymProgress(occupiedL17Keys.size)
    };
  }

  function createSelectionController(onChange) {
    let selectedCell = null;
    function publish() { if (typeof onChange === 'function') onChange(selectedCell); }
    return {
      getSelectedCell() { return selectedCell; },
      select(cell) {
        selectedCell = isSameCell(selectedCell, cell) ? null : cell;
        publish();
        return selectedCell;
      },
      clear() {
        if (!selectedCell) return;
        selectedCell = null;
        publish();
      }
    };
  }

  global.S2L14Analysis = Object.freeze({
    GYM_THRESHOLDS,
    isSameCell,
    normalizeWayfarerMapData,
    getRecordsInL14,
    calculateL14Metrics,
    createSelectionController
  });
})(globalThis);
