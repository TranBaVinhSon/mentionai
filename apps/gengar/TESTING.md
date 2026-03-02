# Testing the Retrieval System

## Quick Start

### Run All Tests
```bash
yarn test src/modules/retrieval/__tests__/
```

### Run Specific Test Suites
```bash
# Query classifier tests
yarn test query-classifier.service.spec.ts

# Orchestrator tests
yarn test retrieval-orchestrator-phase01.spec.ts

# With coverage
yarn test:cov --testPathPattern=retrieval
```

### Using the Test Script
```bash
# All tests
./scripts/run-retrieval-tests.sh all

# Classifier only
./scripts/run-retrieval-tests.sh classifier

# Orchestrator only
./scripts/run-retrieval-tests.sh orchestrator

# With coverage
./scripts/run-retrieval-tests.sh coverage

# Watch mode (for TDD)
./scripts/run-retrieval-tests.sh watch
```

## Test Coverage

### QueryClassifierService (30 tests)
- Intent classification for 10+ intent types
- Entity extraction
- Temporal constraint extraction
- Confidence requirement mapping
- Fallback pattern matching

### RetrievalOrchestrator (15 tests)
- Baseline retrieval (Chroma + Mem0)
- Temporal retrieval with date filtering
- Confidence scoring (high/medium/low/none)
- Deduplication
- Performance (<1s)

**Total**: 45 tests

## Test Data

### Test Questions (`__tests__/fixtures/test-questions.ts`)
- 59 test questions organized by category
- Covers all evaluation scenarios from `evaluation/questions.csv`

### Mock Data (`__tests__/fixtures/mock-data.ts`)
- Mock social content (posts, articles)
- Mock Chroma results
- Mock Mem0 results
- Expected outcomes for each test case

## Success Criteria

- [ ] All 45 tests passing
- [ ] 80%+ query classification accuracy
- [ ] Proper confidence levels for all query types
- [ ] Zero hallucinations on private info queries
- [ ] <1s average retrieval time
- [ ] 80%+ code coverage

## Debugging Failed Tests

### Classification Issues
If intent classification is wrong:
1. Check `query-classifier.service.ts`
2. Improve fallback patterns in `fallbackClassification()`
3. Adjust OpenAI prompt if needed

### Confidence Scoring Issues
If confidence levels are incorrect:
1. Check `calculateConfidence()` in `retrieval-orchestrator.service.ts`
2. Adjust thresholds for high/medium/low
3. Verify result quality scoring

### Performance Issues
If tests are too slow:
1. Ensure parallel execution with `Promise.all()`
2. Check for sequential `await` calls
3. Verify mock data is not hitting real APIs

## Continuous Testing

### Watch Mode
```bash
# Terminal 1: Watch tests
./scripts/run-retrieval-tests.sh watch

# Terminal 2: Edit code
# Tests auto-run on save!
```

### Pre-Commit Hook
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
yarn test src/modules/retrieval/__tests__/ --bail --passWithNoTests
```

## Test Structure

```
src/modules/retrieval/__tests__/
├── fixtures/
│   ├── test-questions.ts          # Test cases from evaluation CSV
│   └── mock-data.ts                # Mock content and results
├── query-classifier.service.spec.ts
│   ├── Intent Classification (10+ describe blocks)
│   ├── Entity Extraction
│   ├── Temporal Extraction
│   └── Edge Cases
└── retrieval-orchestrator-phase01.spec.ts
    ├── Baseline Retrieval
    ├── Temporal Retrieval
    ├── Confidence Scoring
    ├── Deduplication
    └── Performance
```

## Running Tests in CI/CD

```yaml
# Example GitHub Actions workflow
- name: Run Retrieval Tests
  run: |
    export OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
    yarn test src/modules/retrieval/__tests__/ --coverage
```

## Next Steps

1. Run tests: `yarn test src/modules/retrieval/__tests__/`
2. Check results and fix any failures
3. Verify coverage: `yarn test:cov --testPathPattern=retrieval`
4. Run in watch mode during development
5. Ensure all tests pass before merging PR

---

For more details on the implementation, see `RETRIEVAL_PR_SUMMARY.md`.
