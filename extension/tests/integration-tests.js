// Integration Tests for Extension
// Run with: node tests/integration-tests.js

const fs = require('fs');
const path = require('path');

class IntegrationTests {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\nRunning Integration Tests\n');
    console.log('='.repeat(60));

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`PASS ${name}`);
      } catch (error) {
        this.failed++;
        console.log(`FAIL ${name}`);
        console.log(`   Error: ${error.message}`);
      }
    }

    console.log('='.repeat(60));
    console.log(`\nResults: ${this.passed} passed, ${this.failed} failed\n`);

    if (this.failed > 0) process.exit(1);
  }

  assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
  }

  assertContains(text, substring, message) {
    if (!text.includes(substring)) {
      throw new Error(message || `Expected text to contain "${substring}"`);
    }
  }

  assertNotContains(text, substring, message) {
    if (text.includes(substring)) {
      throw new Error(message || `Expected text not to contain "${substring}"`);
    }
  }
}

const tests = new IntegrationTests();

tests.test('background.js saves memories through ingest API', () => {
  const code = fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8');
  tests.assertContains(code, 'apiClient.ingestMemory', 'background.js should use the ingest API for memory saves');
  tests.assertContains(code, 'request.action === "saveToMemory"', 'background.js should handle saveToMemory');
  tests.assertContains(code, 'request.action === "savePageToMemory"', 'background.js should handle toolbar page saves');
  tests.assertContains(code, 'request.action === "saveNoteToMemory"', 'background.js should handle toolbar note saves');
});

tests.test('background.js keeps processing behind backend proxy', () => {
  const code = fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8');
  tests.assertContains(code, '/api/proxy/openrouter', 'background.js should use backend proxy for AI processing');
});

tests.test('background.js has no visual generation handlers', () => {
  const code = fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8');
  tests.assertNotContains(code, 'createVisualContent', 'visual content handler should not be active');
  tests.assertNotContains(code, 'generateAIImage', 'AI image handler should not be active');
  tests.assertNotContains(code, 'template-generators.js', 'template generators should not be imported');
});

tests.test('api-client.js exposes ingestMemory and has no Airtable methods', () => {
  const code = fs.readFileSync(path.join(__dirname, '../api-client.js'), 'utf8');
  tests.assertContains(code, 'async ingestMemory', 'api-client should expose ingestMemory');
  tests.assertContains(code, '/api/ingest', 'api-client should call /api/ingest');
  tests.assertNotContains(code, 'airtable', 'Airtable client code should be removed');
});

tests.test('content.js defaults the modal to memory', () => {
  const code = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');
  tests.assertContains(code, "key === 'memory'", 'memory mode should be the default option');
  tests.assertContains(code, "const initialMode = isImage ? 'describe_image' : 'memory'", 'text modal should open in memory mode');
});

tests.test('content.js has no active visual content UI', () => {
  const code = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');
  tests.assertNotContains(code, 'data-action="create-image"', 'FAB should not expose create-image');
  tests.assertNotContains(code, 'openVisualContentModal', 'visual content modal should be removed');
});

tests.test('settings.json is memory-first', () => {
  const settings = JSON.parse(fs.readFileSync(path.join(__dirname, '../settings.json'), 'utf8'));
  tests.assert(settings.modes?.memory, 'settings should include memory mode');
  tests.assert(settings.ui?.defaultMode === 'memory', 'defaultMode should be memory');
  tests.assert(!settings.visualContent, 'visualContent config should be removed');
  tests.assert(!settings.airtable, 'airtable config should be removed');
});

tests.test('manifest.json has required capture permissions', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.json'), 'utf8'));
  const required = ['activeTab', 'scripting', 'storage', 'contextMenus', 'tabs'];
  required.forEach((permission) => {
    tests.assert(manifest.permissions?.includes(permission), `manifest should include ${permission}`);
  });
  tests.assert(manifest.action?.default_popup === 'popup.html', 'manifest should wire toolbar icon to popup.html');
});

tests.test('required extension files exist', () => {
  const required = ['manifest.json', 'background.js', 'content.js', 'api-client.js', 'settings-manager.js', 'settings.json', 'styles.css', 'popup.html', 'popup.css', 'popup.js'];
  required.forEach((file) => {
    tests.assert(fs.existsSync(path.join(__dirname, '..', file)), `Required file ${file} should exist`);
  });
});

tests.test('popup exposes memory actions', () => {
  const html = fs.readFileSync(path.join(__dirname, '../popup.html'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '../popup.js'), 'utf8');
  tests.assertContains(html, 'save-page', 'popup should expose save page action');
  tests.assertContains(html, 'save-selection', 'popup should expose save selection action');
  tests.assertContains(html, 'quick-note', 'popup should expose quick note input');
  tests.assertContains(js, 'savePageToMemory', 'popup should send savePageToMemory');
  tests.assertContains(js, 'saveNoteToMemory', 'popup should send saveNoteToMemory');
});

tests.run().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
