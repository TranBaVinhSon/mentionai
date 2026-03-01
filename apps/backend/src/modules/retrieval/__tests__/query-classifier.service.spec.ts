import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { QueryClassifierService, QueryIntent } from "../query-classifier.service";
import {
  ALL_TEST_QUESTIONS,
  FACTUAL_ACCURACY_QUESTIONS,
  HALLUCINATION_DETECTION_QUESTIONS,
  TEMPORAL_AWARENESS_QUESTIONS,
  ANALYTICS_QUESTIONS,
  CONTENT_SEARCH_QUESTIONS,
  PERSONALITY_QUESTIONS,
  CASUAL_CONVERSATION_QUESTIONS,
  OPINION_QUESTIONS,
  STORY_QUESTIONS,
  TestQuestion,
} from "./fixtures/test-questions";

describe("QueryClassifierService", () => {
  let service: QueryClassifierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryClassifierService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "OPENAI_API_KEY") return process.env.OPENAI_API_KEY || "test-api-key";
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<QueryClassifierService>(QueryClassifierService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("Intent Classification - Factual Accuracy", () => {
    it.each(FACTUAL_ACCURACY_QUESTIONS)(
      'should classify "$question" as $expectedIntent',
      async (testCase: TestQuestion) => {
        const result = await service.classifyQuery(testCase.question);

        expect(result.intent).toBe(testCase.expectedIntent);
        expect(result.confidenceRequired).toBe(testCase.expectedConfidenceRequired);
        expect(result.requiresPrivateInfo).toBe(testCase.requiresPrivateInfo);

        // Check entities (at least some should match)
        if (testCase.expectedEntities && testCase.expectedEntities.length > 0) {
          const hasMatchingEntity = testCase.expectedEntities.some((expectedEntity) =>
            result.entities.some((entity) => entity.toLowerCase().includes(expectedEntity.toLowerCase())),
          );
          expect(hasMatchingEntity).toBe(true);
        }

        // Check temporal constraint for recent events
        if (testCase.expectedTemporal) {
          expect(result.temporalConstraint).toBeDefined();
          expect(result.temporalConstraint?.recency).toBe(testCase.expectedTemporal.recency);

          if (testCase.expectedTemporal.recencyDays) {
            expect(result.temporalConstraint?.recencyDays).toBe(testCase.expectedTemporal.recencyDays);
          }
        }
      },
    );
  });

  describe("Intent Classification - Hallucination Detection", () => {
    it.each(HALLUCINATION_DETECTION_QUESTIONS)(
      'should classify "$question" as uncertainty_test with requiresPrivateInfo=true',
      async (testCase: TestQuestion) => {
        const result = await service.classifyQuery(testCase.question);

        expect(result.intent).toBe(QueryIntent.UNCERTAINTY_TEST);
        expect(result.requiresPrivateInfo).toBe(true);
        expect(result.confidenceRequired).toBe("high");
      },
    );

    it("should detect breakfast query as private information", async () => {
      const result = await service.classifyQuery("What did you have for breakfast today?");

      expect(result.intent).toBe(QueryIntent.UNCERTAINTY_TEST);
      expect(result.requiresPrivateInfo).toBe(true);
    });

    it("should detect fake event as private information", async () => {
      const result = await service.classifyQuery("Remember when we met at TechCrunch Disrupt?");

      expect(result.intent).toBe(QueryIntent.UNCERTAINTY_TEST);
      expect(result.requiresPrivateInfo).toBe(true);
    });
  });

  describe("Intent Classification - Temporal Awareness", () => {
    it.each(TEMPORAL_AWARENESS_QUESTIONS)(
      'should classify "$question" as historical_timeline',
      async (testCase: TestQuestion) => {
        const result = await service.classifyQuery(testCase.question);

        expect(result.intent).toBe(QueryIntent.HISTORICAL_TIMELINE);
        expect(result.temporalConstraint).toBeDefined();
        expect(result.temporalConstraint?.recency).toBe("historical");
      },
    );

    it("should extract year from temporal query", async () => {
      const result = await service.classifyQuery("What was your opinion on AI in 2022 vs now?");

      expect(result.intent).toBe(QueryIntent.HISTORICAL_TIMELINE);
      expect(result.temporalConstraint).toBeDefined();
      // Should have some reference to 2022 in entities or temporal constraint
      const has2022 = result.entities.includes("2022") || result.temporalConstraint?.type === "absolute";
      expect(has2022).toBe(true);
    });
  });

  describe("Intent Classification - Analytics", () => {
    it.each(ANALYTICS_QUESTIONS)(
      'should classify "$question" as analytics_query with requiresAggregation=true',
      async (testCase: TestQuestion) => {
        const result = await service.classifyQuery(testCase.question);

        expect(result.intent).toBe(QueryIntent.ANALYTICS_QUERY);
        expect(result.requiresAggregation).toBe(true);
      },
    );

    it("should detect topic frequency query", async () => {
      const result = await service.classifyQuery("What topics do you post about most?");

      expect(result.intent).toBe(QueryIntent.ANALYTICS_QUERY);
      expect(result.requiresAggregation).toBe(true);
    });

    it("should detect popularity query", async () => {
      const result = await service.classifyQuery("What's your most popular content?");

      expect(result.intent).toBe(QueryIntent.ANALYTICS_QUERY);
      expect(result.requiresAggregation).toBe(true);
    });
  });

  describe("Intent Classification - Content Search", () => {
    it.each(CONTENT_SEARCH_QUESTIONS)(
      'should classify "$question" as content_search',
      async (testCase: TestQuestion) => {
        const result = await service.classifyQuery(testCase.question);

        expect(result.intent).toBe(QueryIntent.CONTENT_SEARCH);
      },
    );

    it("should extract topic entities from search query", async () => {
      const result = await service.classifyQuery("Find all your posts about machine learning");

      expect(result.intent).toBe(QueryIntent.CONTENT_SEARCH);
      const hasMachineLearning = result.entities.some((e) => e.includes("machine") || e.includes("learning"));
      expect(hasMachineLearning).toBe(true);
    });
  });

  describe("Intent Classification - Personality", () => {
    it.each(PERSONALITY_QUESTIONS)(
      'should classify "$question" as personality or opinion query',
      async (testCase: TestQuestion) => {
        const result = await service.classifyQuery(testCase.question);

        expect([QueryIntent.PERSONALITY_QUERY, QueryIntent.OPINION_QUERY]).toContain(result.intent);
      },
    );
  });

  describe("Intent Classification - Casual Conversation", () => {
    it.each(CASUAL_CONVERSATION_QUESTIONS)(
      'should classify "$question" as casual_conversation',
      async (testCase: TestQuestion) => {
        const result = await service.classifyQuery(testCase.question);

        expect(result.intent).toBe(QueryIntent.CASUAL_CONVERSATION);
        expect(result.confidenceRequired).toBe("low");
      },
    );

    it("should handle greetings", async () => {
      const greetings = ["Hey!", "Hello", "Hi there", "What's up?", "How's it going?"];

      for (const greeting of greetings) {
        const result = await service.classifyQuery(greeting);
        expect(result.intent).toBe(QueryIntent.CASUAL_CONVERSATION);
      }
    });
  });

  describe("Intent Classification - Opinions", () => {
    it.each(OPINION_QUESTIONS)('should classify "$question" as opinion_query', async (testCase: TestQuestion) => {
      const result = await service.classifyQuery(testCase.question);

      expect(result.intent).toBe(QueryIntent.OPINION_QUERY);
    });
  });

  describe("Intent Classification - Stories", () => {
    it.each(STORY_QUESTIONS)('should classify "$question" as story_request', async (testCase: TestQuestion) => {
      const result = await service.classifyQuery(testCase.question);

      expect(result.intent).toBe(QueryIntent.STORY_REQUEST);
    });

    it('should detect "tell me about" patterns', async () => {
      const result = await service.classifyQuery("Tell me about a time when you failed");

      expect(result.intent).toBe(QueryIntent.STORY_REQUEST);
    });
  });

  describe("Temporal Constraint Extraction", () => {
    it('should extract "last week" as 7 days', async () => {
      const result = await service.classifyQuery("What did you post last week?");

      expect(result.temporalConstraint).toBeDefined();
      expect(result.temporalConstraint?.type).toBe("relative");
      expect(result.temporalConstraint?.recencyDays).toBe(7);
      expect(result.temporalConstraint?.recency).toBe("recent");
    });

    it('should extract "last month" as 30 days', async () => {
      const result = await service.classifyQuery("What did you post last month?");

      expect(result.temporalConstraint).toBeDefined();
      expect(result.temporalConstraint?.recencyDays).toBeGreaterThanOrEqual(30);
    });

    it("should extract absolute year", async () => {
      const result = await service.classifyQuery("What did you think about AI in 2022?");

      expect(result.temporalConstraint).toBeDefined();
      // Should either have 2022 in entities or be marked as absolute
      const hasYearInfo = result.temporalConstraint?.type === "absolute" || result.entities.includes("2022");
      expect(hasYearInfo).toBe(true);
    });

    it('should handle "recent" keyword', async () => {
      const result = await service.classifyQuery("What are your recent posts?");

      expect(result.temporalConstraint).toBeDefined();
      expect(result.temporalConstraint?.recency).toBe("recent");
    });
  });

  describe("Entity Extraction", () => {
    it("should extract technical terms", async () => {
      const result = await service.classifyQuery("Tell me about your work with GPT-4 and LangChain");

      expect(result.entities).toBeDefined();
      const hasGPT4 = result.entities.some((e) => e.toLowerCase().includes("gpt"));
      const hasLangChain = result.entities.some((e) => e.toLowerCase().includes("langchain"));

      expect(hasGPT4 || hasLangChain).toBe(true);
    });

    it("should extract multiple entities from complex query", async () => {
      const result = await service.classifyQuery("What did you post about machine learning and AI safety last month?");

      expect(result.entities.length).toBeGreaterThan(1);
    });
  });

  describe("Confidence Required", () => {
    it("should require high confidence for factual queries", async () => {
      const result = await service.classifyQuery("Where did you work?");

      expect(result.confidenceRequired).toBe("high");
    });

    it("should require high confidence for hallucination tests", async () => {
      const result = await service.classifyQuery("What did you have for breakfast?");

      expect(result.confidenceRequired).toBe("high");
    });

    it("should require medium confidence for opinions", async () => {
      const result = await service.classifyQuery("What do you think about remote work?");

      expect(result.confidenceRequired).toBe("medium");
    });

    it("should require low confidence for casual conversation", async () => {
      const result = await service.classifyQuery("Hey, how are you?");

      expect(result.confidenceRequired).toBe("low");
    });
  });

  describe("Fallback Behavior", () => {
    it("should handle classification errors gracefully", async () => {
      // Empty query
      const result = await service.classifyQuery("");

      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
    });

    it("should classify ambiguous queries", async () => {
      const result = await service.classifyQuery("Thoughts?");

      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long queries", async () => {
      const longQuery =
        "Can you tell me about your educational background, work experience, projects you have launched, and what cities you have lived in, as well as your thoughts on AI safety, remote work, and machine learning?";

      const result = await service.classifyQuery(longQuery);

      expect(result).toBeDefined();
      expect(result.entities.length).toBeGreaterThan(3);
    });

    it("should handle queries with special characters", async () => {
      const result = await service.classifyQuery("What's your take on AI? 🤖");

      expect(result).toBeDefined();
      expect(result.intent).toBe(QueryIntent.OPINION_QUERY);
    });

    it("should handle multi-language queries gracefully", async () => {
      const result = await service.classifyQuery("What is your educación?");

      expect(result).toBeDefined();
    });
  });

  describe("Full Test Suite Coverage", () => {
    it("should successfully classify all 60 evaluation questions", async () => {
      const results = [];

      for (const testCase of ALL_TEST_QUESTIONS) {
        const result = await service.classifyQuery(testCase.question);
        results.push({
          id: testCase.id,
          question: testCase.question,
          expectedIntent: testCase.expectedIntent,
          actualIntent: result.intent,
          match: result.intent === testCase.expectedIntent,
        });
      }

      // Calculate accuracy
      const matches = results.filter((r) => r.match).length;
      const accuracy = (matches / results.length) * 100;

      console.log(`\nQuery Classification Accuracy: ${accuracy.toFixed(1)}%`);
      console.log(`Matched: ${matches}/${results.length}`);

      // Log failures for debugging
      const failures = results.filter((r) => !r.match);
      if (failures.length > 0) {
        console.log("\nMisclassified queries:");
        failures.forEach((f) => {
          console.log(`  ${f.id}: Expected ${f.expectedIntent}, got ${f.actualIntent}`);
          console.log(`  Question: "${f.question}"`);
        });
      }

      // We want at least 80% accuracy
      expect(accuracy).toBeGreaterThanOrEqual(80);
    }, 120000); // 2 minute timeout for full suite
  });
});
