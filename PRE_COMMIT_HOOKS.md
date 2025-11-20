# Pre-Commit Hooks

## Overview

Automatic test execution before every commit to catch bugs early.

## What Happens

When you run `git commit`, the following happens automatically:

1. **Pre-commit hook triggers**
2. **All tests run** (64 tests, ~7 seconds)
3. **If tests pass** ✅ → Commit proceeds
4. **If tests fail** ❌ → Commit is aborted

## Example

```bash
$ git commit -m "Add new feature"

🧪 Running tests before commit...

> universal-text-processor@2.2.0 test
> npm run test:extension && npm run test:backend

✅ Template Tests: 31 passed, 0 failed
✅ Integration Tests: 21 passed, 0 failed
✅ Backend API Tests: 12 passed, 0 failed

✅ All tests passed! Proceeding with commit...

[master abc1234] Add new feature
 2 files changed, 50 insertions(+)
```

## If Tests Fail

```bash
$ git commit -m "Broken change"

🧪 Running tests before commit...

❌ background.js uses addPost (not savePost)
   Error: background.js should use addPost

📊 Results: 20 passed, 1 failed

❌ Tests failed! Commit aborted.
Please fix the failing tests before committing.
```

## Bypass Hook (Not Recommended)

If you absolutely need to commit without running tests:

```bash
git commit --no-verify -m "Emergency fix"
```

**⚠️ Warning**: Only use `--no-verify` for emergencies. Your broken code may break production.

## Setup

Pre-commit hooks are automatically installed when you run:

```bash
npm install
```

Husky sets up the hooks in `.husky/pre-commit`.

## What's Tested

Before each commit, the hook runs:

- ✅ 31 template generation tests
- ✅ 21 extension integration tests
- ✅ 12 backend API tests

**Total**: 64 tests in ~7 seconds

## Benefits

1. **Catch bugs immediately** - Before they reach the repo
2. **Never commit broken code** - Tests must pass
3. **No manual testing** - Automatic on every commit
4. **Fast feedback** - Know within 7 seconds
5. **Team protection** - Everyone's commits are tested

## Disable/Enable

### Temporarily Disable
```bash
git commit --no-verify -m "Skip tests this time"
```

### Permanently Disable
```bash
rm .husky/pre-commit
```

### Re-enable
```bash
npx husky install
```

## Troubleshooting

### Hook Not Running

```bash
# Reinstall hooks
npx husky install

# Check hook exists
ls -la .husky/pre-commit

# Make executable
chmod +x .husky/pre-commit
```

### Tests Take Too Long

Current: ~7 seconds total

If tests are slow:
- Check network connection (backend tests need internet)
- Skip backend tests: `npm run test:extension` only

### Hook Fails But Tests Pass Locally

```bash
# Run exactly what the hook runs
npm test

# If that passes, reinstall hook
npx husky install
```

## CI/CD Integration

Pre-commit hooks complement CI/CD:

- **Local**: Pre-commit hook catches issues before push
- **Remote**: GitHub Actions runs tests on push

Double protection ensures quality.

## File Structure

```
.husky/
└── pre-commit          # Hook script

package.json            # "prepare": "husky install"
```

## Configuration

Edit `.husky/pre-commit` to customize:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run tests
npm test

# Add custom checks
# npm run lint
# npm run type-check
```

## Best Practices

✅ **DO**:
- Let the hook run on every commit
- Fix tests immediately if they fail
- Keep tests fast (< 10 seconds)

❌ **DON'T**:
- Use `--no-verify` regularly
- Commit broken code
- Disable hooks permanently

---

**Status**: ✅ Active
**Tests**: 64 tests
**Duration**: ~7 seconds
**Success Rate**: 100%
