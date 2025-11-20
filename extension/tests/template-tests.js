// Template Generation Tests
// Run with: node tests/template-tests.js

// Mock service worker environment
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');

// Import template generators
const fs = require('fs');
const path = require('path');
const templateCode = fs.readFileSync(
  path.join(__dirname, '../template-generators.js'),
  'utf8'
);

// Execute template code in isolated scope
const vm = require('vm');
const sandbox = {
  console,
  String,
  Object,
  Array
};
vm.createContext(sandbox);
vm.runInContext(templateCode, sandbox);

// Test suite
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n🧪 Running Template Tests\n');
    console.log('='.repeat(60));

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
    if (!text.includes(substring)) {
      throw new Error(
        message || `Expected text to contain "${substring}"`
      );
    }
  }

  assertNotContains(text, substring, message) {
    if (text.includes(substring)) {
      throw new Error(
        message || `Expected text not to contain "${substring}"`
      );
    }
  }
}

const runner = new TestRunner();

// Test Data
const testText = "Innovation is not about saying yes to everything.";
const testBranding = {
  colors: {
    primary: '#2563eb',
    secondary: '#8b5cf6',
    background: '#ffffff',
    text: '#1f2937'
  },
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif'
  }
};

// Test 1: escapeHtml function exists and works
runner.test('escapeHtml function exists', () => {
  runner.assert(
    typeof sandbox.escapeHtml === 'function',
    'escapeHtml should be a function'
  );
});

runner.test('escapeHtml escapes < and >', () => {
  const result = sandbox.escapeHtml('<script>alert("XSS")</script>');
  runner.assertContains(result, '&lt;script&gt;');
  runner.assertNotContains(result, '<script>');
});

runner.test('escapeHtml escapes quotes', () => {
  const result = sandbox.escapeHtml('Hello "world" and \'quotes\'');
  runner.assertContains(result, '&quot;');
  runner.assertContains(result, '&#39;');
});

runner.test('escapeHtml escapes ampersands', () => {
  const result = sandbox.escapeHtml('Tom & Jerry');
  runner.assertContains(result, '&amp;');
});

runner.test('escapeHtml handles empty string', () => {
  const result = sandbox.escapeHtml('');
  runner.assertEqual(result, '');
});

runner.test('escapeHtml handles null/undefined', () => {
  runner.assertEqual(sandbox.escapeHtml(null), '');
  runner.assertEqual(sandbox.escapeHtml(undefined), '');
});

// Test 2: IMAGE_SPECS exists via getImageSpec function
runner.test('Image specs exist for all types', () => {
  const required = ['quote_card', 'screenshot_card', 'infographic', 'story_card', 'thumbnail'];
  required.forEach(type => {
    const spec = sandbox.getImageSpec(type);
    runner.assert(
      spec,
      `Should have spec for ${type}`
    );
  });
});

runner.test('Image specs have width and height', () => {
  const types = ['quote_card', 'screenshot_card', 'infographic', 'story_card', 'thumbnail'];
  types.forEach(type => {
    const spec = sandbox.getImageSpec(type);
    runner.assert(
      typeof spec.width === 'number' && spec.width > 0,
      `${type} should have valid width`
    );
    runner.assert(
      typeof spec.height === 'number' && spec.height > 0,
      `${type} should have valid height`
    );
  });
});

runner.test('Image specs have correct dimensions', () => {
  const quoteCard = sandbox.getImageSpec('quote_card');
  runner.assertEqual(quoteCard.width, 1200);
  runner.assertEqual(quoteCard.height, 630);
});

// Test 3: getImageSpec function
runner.test('getImageSpec function exists', () => {
  runner.assert(
    typeof sandbox.getImageSpec === 'function',
    'getImageSpec should be a function'
  );
});

runner.test('getImageSpec returns correct specs', () => {
  const spec = sandbox.getImageSpec('quote_card');
  runner.assertEqual(spec.width, 1200);
  runner.assertEqual(spec.height, 630);
});

// Test 4: Generate functions exist
runner.test('generateQuoteCard function exists', () => {
  runner.assert(
    typeof sandbox.generateQuoteCard === 'function',
    'generateQuoteCard should be a function'
  );
});

runner.test('generateScreenshotCard function exists', () => {
  runner.assert(
    typeof sandbox.generateScreenshotCard === 'function',
    'generateScreenshotCard should be a function'
  );
});

runner.test('generateInfographic function exists', () => {
  runner.assert(
    typeof sandbox.generateInfographic === 'function',
    'generateInfographic should be a function'
  );
});

runner.test('generateStoryCard function exists', () => {
  runner.assert(
    typeof sandbox.generateStoryCard === 'function',
    'generateStoryCard should be a function'
  );
});

runner.test('generateThumbnail function exists', () => {
  runner.assert(
    typeof sandbox.generateThumbnail === 'function',
    'generateThumbnail should be a function'
  );
});

// Test 5: generateTemplate function
runner.test('generateTemplate function exists', () => {
  runner.assert(
    typeof sandbox.generateTemplate === 'function',
    'generateTemplate should be a function'
  );
});

runner.test('generateTemplate generates quote_card HTML', () => {
  const html = sandbox.generateTemplate('quote_card', testText, {
    branding: testBranding
  });
  runner.assertContains(html, '<!DOCTYPE html>');
  runner.assertContains(html, testText);
});

runner.test('generateTemplate generates screenshot_card HTML', () => {
  const html = sandbox.generateTemplate('screenshot_card', testText, {
    branding: testBranding
  });
  runner.assertContains(html, '<!DOCTYPE html>');
  runner.assertContains(html, testText);
});

runner.test('generateTemplate generates infographic HTML', () => {
  const html = sandbox.generateTemplate('infographic', testText, {
    branding: testBranding
  });
  runner.assertContains(html, '<!DOCTYPE html>');
});

runner.test('generateTemplate generates story_card HTML', () => {
  const html = sandbox.generateTemplate('story_card', testText, {
    branding: testBranding
  });
  runner.assertContains(html, '<!DOCTYPE html>');
  runner.assertContains(html, testText);
});

runner.test('generateTemplate generates thumbnail HTML', () => {
  const html = sandbox.generateTemplate('thumbnail', testText, {
    branding: testBranding
  });
  runner.assertContains(html, '<!DOCTYPE html>');
  runner.assertContains(html, testText);
});

runner.test('generateTemplate throws error for invalid type', () => {
  try {
    sandbox.generateTemplate('invalid_type', testText);
    throw new Error('Should have thrown error');
  } catch (error) {
    runner.assertContains(error.message, 'Unknown image type');
  }
});

// Test 6: HTML structure validation
runner.test('Generated HTML has proper structure', () => {
  const html = sandbox.generateTemplate('quote_card', testText, {
    branding: testBranding
  });
  runner.assertContains(html, '<html>');
  runner.assertContains(html, '<head>');
  runner.assertContains(html, '<body>');
  runner.assertContains(html, '</html>');
});

runner.test('Generated HTML has style tag', () => {
  const html = sandbox.generateTemplate('quote_card', testText, {
    branding: testBranding
  });
  runner.assertContains(html, '<style>');
  runner.assertContains(html, '</style>');
});

runner.test('Generated HTML uses branding colors', () => {
  const html = sandbox.generateTemplate('quote_card', testText, {
    branding: testBranding
  });
  runner.assertContains(html, testBranding.colors.primary);
});

// Test 7: XSS Prevention
runner.test('generateTemplate escapes malicious HTML', () => {
  const maliciousText = '<script>alert("XSS")</script>';
  const html = sandbox.generateTemplate('quote_card', maliciousText, {
    branding: testBranding
  });
  runner.assertNotContains(html, '<script>alert');
  runner.assertContains(html, '&lt;script&gt;');
});

runner.test('generateTemplate escapes quotes in text', () => {
  const textWithQuotes = 'He said "Hello" and she replied';
  const html = sandbox.generateTemplate('quote_card', textWithQuotes, {
    branding: testBranding
  });
  runner.assertContains(html, '&quot;');
});

// Test 8: Service worker compatibility
runner.test('Code does not use document API', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../template-generators.js'),
    'utf8'
  );
  runner.assertNotContains(
    code,
    'document.createElement',
    'Should not use document.createElement'
  );
  runner.assertNotContains(
    code,
    'document.querySelector',
    'Should not use document.querySelector'
  );
});

runner.test('Code does not use window API', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../template-generators.js'),
    'utf8'
  );
  runner.assertNotContains(
    code,
    'window.',
    'Should not use window API'
  );
});

runner.test('Code does not use DOM manipulation', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../template-generators.js'),
    'utf8'
  );
  runner.assertNotContains(
    code,
    '.innerHTML',
    'Should not use innerHTML'
  );
  runner.assertNotContains(
    code,
    '.appendChild',
    'Should not use appendChild'
  );
});

// Run all tests
runner.run().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
