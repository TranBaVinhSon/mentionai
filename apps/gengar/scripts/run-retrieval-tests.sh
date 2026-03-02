#!/bin/bash

# Test-Driven Development Runner for Retrieval System
# This script runs all retrieval tests and generates a coverage report

set -e

echo "======================================"
echo "Retrieval System TDD Test Runner"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
  echo -e "${YELLOW}Warning: OPENAI_API_KEY not set. QueryClassifierService tests may fail.${NC}"
  echo "Set it with: export OPENAI_API_KEY='your-key-here'"
  echo ""
fi

# Run tests based on argument
case "$1" in
  "classifier")
    echo -e "${GREEN}Running QueryClassifierService tests...${NC}"
    echo ""
    yarn test src/modules/retrieval/__tests__/query-classifier.service.spec.ts --verbose
    ;;

  "orchestrator")
    echo -e "${GREEN}Running RetrievalOrchestratorService tests...${NC}"
    echo ""
    yarn test src/modules/retrieval/__tests__/retrieval-orchestrator.service.spec.ts --verbose
    ;;

  "all")
    echo -e "${GREEN}Running ALL retrieval tests...${NC}"
    echo ""
    yarn test src/modules/retrieval/__tests__/ --verbose
    ;;

  "coverage")
    echo -e "${GREEN}Running tests with coverage report...${NC}"
    echo ""
    yarn test:cov --testPathPattern=src/modules/retrieval/__tests__
    ;;

  "watch")
    echo -e "${GREEN}Running tests in watch mode...${NC}"
    echo ""
    yarn test:watch --testPathPattern=src/modules/retrieval/__tests__
    ;;

  *)
    echo "Usage: ./scripts/run-retrieval-tests.sh [option]"
    echo ""
    echo "Options:"
    echo "  classifier    - Run only QueryClassifierService tests"
    echo "  orchestrator  - Run only RetrievalOrchestratorService tests"
    echo "  all           - Run all retrieval tests (default)"
    echo "  coverage      - Run tests with coverage report"
    echo "  watch         - Run tests in watch mode (for TDD)"
    echo ""
    echo "Examples:"
    echo "  ./scripts/run-retrieval-tests.sh classifier"
    echo "  ./scripts/run-retrieval-tests.sh all"
    echo "  ./scripts/run-retrieval-tests.sh coverage"
    echo ""

    # Default to running all tests
    echo -e "${GREEN}Running ALL retrieval tests by default...${NC}"
    echo ""
    yarn test src/modules/retrieval/__tests__/ --verbose
    ;;
esac

echo ""
echo -e "${GREEN}======================================"
echo "Tests completed!"
echo "======================================"
echo -e "${NC}"
