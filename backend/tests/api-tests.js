// Backend API Tests
// Run with: node tests/api-tests.js

const https = require('https');
const http = require('http');

const API_BASE_URL = 'https://text-processor-api.kureckamichal.workers.dev';

class APITests {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n🧪 Running Backend API Tests\n');
    console.log('='.repeat(60));
    console.log(`Testing: ${API_BASE_URL}\n`);

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✅ ${name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
      }
    }

    console.log('='.repeat(60));
    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed\n`);

    if (this.failed > 0) {
      process.exit(1);
    }
  }

  async fetch(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, API_BASE_URL);
      const protocol = url.protocol === 'https:' ? https : http;

      const req = protocol.request(
        url,
        {
          method: options.method || 'GET',
          headers: options.headers || {},
          timeout: 10000
        },
        (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve({ status: res.statusCode, data: json, headers: res.headers });
            } catch {
              resolve({ status: res.statusCode, data, headers: res.headers });
            }
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(
        message || `Expected ${expected}, got ${actual}`
      );
    }
  }

  assertContains(text, substring, message) {
    const str = typeof text === 'string' ? text : JSON.stringify(text);
    if (!str.includes(substring)) {
      throw new Error(
        message || `Expected to contain "${substring}"`
      );
    }
  }
}

const tests = new APITests();

// Test 1: Health checks
tests.test('GET / returns API info', async () => {
  const res = await tests.fetch('/');
  tests.assertEqual(res.status, 200, 'Should return 200 OK');
  tests.assert(res.data.success, 'Response should have success: true');
  tests.assertContains(res.data.message, 'Universal Text Processor');
});

tests.test('GET /health returns healthy status', async () => {
  const res = await tests.fetch('/health');
  tests.assertEqual(res.status, 200, 'Should return 200 OK');
  tests.assert(res.data.success, 'Should be successful');
  tests.assertEqual(res.data.status, 'healthy', 'Should be healthy');
});

// Test 2: Webhook endpoint exists
tests.test('POST /api/v1/webhook accepts requests', async () => {
  const res = await tests.fetch('/api/v1/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      event: 'test_event',
      data: { message: 'Test webhook' }
    }
  });
  tests.assertEqual(res.status, 200, 'Should return 200 OK');
  tests.assert(res.data.success, 'Should be successful');
});

tests.test('POST /api/webhook accepts requests (alias)', async () => {
  const res = await tests.fetch('/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      event: 'test_event',
      data: { message: 'Test webhook alias' }
    }
  });
  tests.assertEqual(res.status, 200, 'Should return 200 OK');
  tests.assert(res.data.success, 'Should be successful');
});

tests.test('GET /api/webhook/health returns healthy', async () => {
  const res = await tests.fetch('/api/webhook/health');
  tests.assertEqual(res.status, 200, 'Should return 200 OK');
  tests.assert(res.data.success, 'Should be successful');
});

// Test 3: Visual content webhook
tests.test('POST /api/v1/webhook with visual content event', async () => {
  const res = await tests.fetch('/api/v1/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      event: 'onVisualContentCreated',
      data: {
        text: 'Test text',
        imageTypes: ['quote_card'],
        images: [{
          type: 'quote_card',
          url: 'data:image/png;base64,test',
          width: 1200,
          height: 630
        }]
      }
    }
  });
  tests.assertEqual(res.status, 200, 'Should accept visual content webhook');
});

// Test 4: CORS headers
tests.test('API has CORS headers', async () => {
  const res = await tests.fetch('/');
  tests.assert(
    res.headers['access-control-allow-origin'],
    'Should have CORS allow-origin header'
  );
});

// Test 5: 404 handling
tests.test('GET /nonexistent returns 404', async () => {
  const res = await tests.fetch('/nonexistent');
  tests.assertEqual(res.status, 404, 'Should return 404');
  tests.assertEqual(res.data.success, false, 'Should have success: false');
});

tests.test('POST /api/nonexistent returns 404', async () => {
  const res = await tests.fetch('/api/nonexistent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {}
  });
  tests.assertEqual(res.status, 404, 'Should return 404');
});

// Test 6: API routes structure
tests.test('API follows /api/{resource} structure', async () => {
  // Just verify the structure is consistent
  const res = await tests.fetch('/api/webhook/health');
  tests.assertEqual(res.status, 200, '/api/webhook/health should exist');
});

// Test 7: Webhook error handling
tests.test('POST /api/v1/webhook handles invalid JSON', async () => {
  const res = await tests.fetch('/api/v1/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { invalid: 'missing event field' }
  });
  // Should still accept it (we're lenient for now)
  tests.assert(
    res.status === 200 || res.status === 400,
    'Should handle gracefully'
  );
});

// Test 8: Performance
tests.test('API responds within 2 seconds', async () => {
  const start = Date.now();
  await tests.fetch('/health');
  const duration = Date.now() - start;
  tests.assert(
    duration < 2000,
    `Should respond within 2s (took ${duration}ms)`
  );
});

// Run all tests
tests.run().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
