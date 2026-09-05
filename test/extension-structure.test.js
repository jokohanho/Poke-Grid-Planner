const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = relativePath => fs.existsSync(path.join(root, relativePath));
const manifest = JSON.parse(read('manifest.json'));

test('manifest is a valid MV3 extension for the configured Scopely host', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.host_permissions, ['*://wayfarer.scopely.com/*']);
  assert.ok(manifest.content_scripts[0].js.indexOf('scripts/wayfarer-config.js') < manifest.content_scripts[0].js.indexOf('scripts/bridge.js'));

  for (const contentScript of manifest.content_scripts) {
    assert.deepEqual(contentScript.matches, ['*://wayfarer.scopely.com/*']);
    for (const script of contentScript.js) assert.equal(exists(script), true, `${script} is missing`);
    for (const stylesheet of contentScript.css || []) assert.equal(exists(stylesheet), true, `${stylesheet} is missing`);
  }

  for (const resource of manifest.web_accessible_resources) {
    assert.deepEqual(resource.matches, ['*://wayfarer.scopely.com/*']);
    for (const file of resource.resources) assert.equal(exists(file), true, `${file} is missing`);
  }
});

test('L14 analysis documentation is included with the extension source', () => {
  assert.equal(exists('docs/L14-ANALYSIS-PRD.md'), true);
  assert.match(read('docs/L14-ANALYSIS-PRD.md'), /empty L17 cells = 64 - unique occupied L17 cells/);
  assert.match(read('README.md'), /docs\/L14-ANALYSIS-PRD\.md/);
});

test('extension-page scripts load shared configuration before consumers', () => {
  const popup = read('popup/popup.html');
  const nominations = read('pages/nominations.html');

  assert.ok(popup.indexOf('../scripts/wayfarer-config.js') < popup.indexOf('popup.js'));
  assert.ok(nominations.indexOf('../scripts/wayfarer-config.js') < nominations.indexOf('nominations.js'));
  assert.ok(manifest.content_scripts[1].js.indexOf('scripts/wayfarer-config.js') < manifest.content_scripts[1].js.indexOf('scripts/content.js'));
  assert.ok(manifest.content_scripts[1].js.indexOf('scripts/l14-analysis.js') < manifest.content_scripts[1].js.indexOf('scripts/content.js'));
  assert.match(popup, /id="analyzeBtn"/);
});

test('extension pages use the local UI stylesheet without remote stylesheet dependencies', () => {
  const extensionPages = ['popup/popup.html', 'pages/nominations.html'];

  for (const page of extensionPages) {
    const contents = read(page);
    assert.match(contents, /\.\.\/styles\/extension-ui\.css/);
    assert.doesNotMatch(contents, /<link[^>]+href=["']https?:\/\//i);
  }

  assert.equal(exists('styles/extension-ui.css'), true);
});

test('all extension JavaScript files parse successfully', () => {
  const files = [
    'scripts/wayfarer-config.js',
    'scripts/bridge.js',
    'scripts/content.js',
    'scripts/emoji.js',
    'scripts/s2geometry.js',
    'scripts/l14-analysis.js',
    'popup/popup.js',
    'pages/nominations.js'
  ];

  for (const file of files) {
    new vm.Script(read(file), { filename: file });
  }
});
