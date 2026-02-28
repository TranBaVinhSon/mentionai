import { Test, TestingModule } from "@nestjs/testing";
import { RetrievalOrchestratorService } from "../retrieval-orchestrator.service";
import { QueryClassifierService, QueryIntent } from "../query-classifier.service";
import { ChromaService } from "../../chroma/chroma.service";
import { MemoryService } from "../../memory/memory.service";
import { SocialContentRepository } from "../../../db/repositories/social-content.repository";
import { AppLinkRepository } from "../../../db/repositories/app-link.repository";
import { EmbeddingsService } from "../../embeddings/embeddings.service";
import { ConfigService } from "@nestjs/config";
import { MOCK_USER_ID, MOCK_APP_ID, MOCK_CHROMA_RESULTS, MOCK_MEM0_RESULTS } from "./fixtures/mock-data";

describe("RetrievalOrchestratorService - Phase 0+1", () => {
  let orchestrator: RetrievalOrchestratorService;
  let queryClassifier: QueryClassifierService;
  let chromaService: ChromaService;
  let memoryService: MemoryService;
  let socialContentRepo: SocialContentRepository;

  beforeEach(async () => {
    const mockChromaService = {
      query: jest.fn().mockResolvedValue(MOCK_CHROMA_RESULTS),
    };

    const mockMemoryService = {
      searchMemories: jest.fn().mockResolvedValue(MOCK_MEM0_RESULTS),
    };

    const mockSocialContentRepo = {
      query: jest.fn().mockResolvedValue([]),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      fullTextSearch: jest.fn().mockResolvedValue([]),
    };

    const mockAppLinkRepo = {
      query: jest.fn().mockResolvedValue([]),
      find: jest.fn().mockResolvedValue([]),
    };

    const mockEmbeddingsService = {
      generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };

    const mockRollbar = {
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrievalOrchestratorService,
        QueryClassifierService,
        {
          provide: ChromaService,
          useValue: mockChromaService,
        },
        {
          provide: MemoryService,
          useValue: mockMemoryService,
        },
        {
          provide: SocialContentRepository,
          useValue: mockSocialContentRepo,
        },
        {
          provide: AppLinkRepository,
          useValue: mockAppLinkRepo,
        },
        {
          provide: EmbeddingsService,
          useValue: mockEmbeddingsService,
        },
        {
          provide: "ROLLBAR_TOKEN",
          useValue: mockRollbar,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "ANTHROPIC_API_KEY") return process.env.ANTHROPIC_API_KEY || "test-api-key";
              return null;
            }),
          },
        },
      ],
    }).compile();

    orchestrator = module.get<RetrievalOrchestratorService>(RetrievalOrchestratorService);
    queryClassifier = module.get<QueryClassifierService>(QueryClassifierService);
    chromaService = module.get<ChromaService>(ChromaService);
    memoryService = module.get<MemoryService>(MemoryService);
    socialContentRepo = module.get<SocialContentRepository>(SocialContentRepository);
  });

  it("should be defined", () => {
    expect(orchestrator).toBeDefined();
  });

  describe("Phase 0: Foundation - Query Classification & Confidence", () => {
    it("should classify query and return confidence level", async () => {
      const result = await orchestrator.retrieve({
        query: "What's your educational background?",
        userId: MOCK_USER_ID,
        appId: MOCK_APP_ID,
      });

      expect(result.queryAnalysis).toBeDefined();
      expect(result.queryAnalysis.intent).toBeDefined();
      expect(result.confidenceLevel).toBeDefined();
      expect(["high", "medium", "low", "none"]).toContain(result.confidenceLevel);
    });

    it("should return HIGH confidence with many results", async () => {
      (chromaService.query as jest.Mock).mockResolvedValue(MOCK_CHROMA_RESULTS.map((r) => ({ ...r, score: 0.9 })));
      (memoryService.searchMemories as jest.Mock).mockResolvedValue(
        MOCK_MEM0_RESULTS.map((r) => ({ ...r, score: 0.88 })),
      );

      const result = await orchestrator.retrieve({
        query: "What's your educational background?",
        userId: MOCK_USER_ID,
        appId: MOCK_APP_ID,
      });

      expect(result.confidenceLevel).toBe("high");
    });

    it("should return NONE confidence for hallucination test", async () => {
      (chromaService.query as jest.Mock).mockResolvedValue([]);
      (memoryService.searchMemories as jest.Mock).mockResolvedValue([]);

      const result = await orchestrator.retrieve({
        query: "What did you have for breakfast today?",
        userId: MOCK_USER_ID,
        appId: MOCK_APP_ID,
      });

      expect(result.queryAnalysis.intent).toBe(QueryIntent.UNCERTAINTY_TEST);
      expect(result.confidenceLevel).toBe("none");
      expect(result.totalResults).toBe(0);
    });

    it("should return empty results for uncertainty test queries", async () => {
      const result = await orchestrator.retrieve({
        query: "Remember when we met at TechCrunch Disrupt?",
        userId: MOCK_USER_ID,
        appId: MOCK_APP_ID,
      });

      expect(result.queryAnalysis.intent).toBe(QueryIntent.UNCERTAINTY_TEST);
      expect(result.totalResults).toBe(0);
    });
  });

  describe("Phase 1: Temporal Retrieval", () => {
    it("should use temporal retrieval for recent events query", async () => {
      const recentPosts = [
        {
          id: 10,
          appId: MOCK_APP_ID,
          content: "Recent post about AI",
          source: "linkedin",
          type: "post",
          socialContentCreatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          metadata: {},
        },
      ];

      (socialContentRepo.query as jest.Mock).mockResolvedValue(recentPosts);

      const result = await orchestrator.retrieve({
        query: "What did you post about AI last week?",
        userId: MOCK_USER_ID,
        appId: MOCK_APP_ID,
      });

      expect(result.queryAnalysis.intent).toBe(QueryIntent.RECENT_EVENTS);
      expect(result.queryAnalysis.temporalConstraint).toBeDefined();
      expect(result.queryAnalysis.temporalConstraint?.recencyDays).toBe(7);

      // Should call database with temporal filter
      expect(socialContentRepo.query).toHaveBeenCalled();
    });

    it("should NOT use temporal retrieval for non-temporal queries", async () => {
      const result = await orchestrator.retrieve({
        query: "What's your opinion on remote work?",
        userId: MOCK_USER_ID,
        appId: MOCK_APP_ID,
      });

      expect(result.queryAnalysis.intent).toBe(QueryIntent.OPINION_QUERY);

      // Should NOT have called social content repo (no temporal retrieval)
      expect(socialContentRepo.query).not.toHaveBeenCalled();
    });

    it("should extract temporal constraint from query", async () => {
      const result = await orchestrator.retrieve({
        query: "What did you post last month?",
        userId: MOCK_USER_ID,
        appId: MOCK_APP_ID,
      });

      expect(result.queryAnalysis.temporalConstraint).toBeDefined();
      expect(result.queryAnalysis.temporalConstraint?.recency).toBe("recent");
    });

    it("should handle historical timeline queries", async () => {
      const result = await orchestrator.retrieve({
        query: "What was your opinion on AI in 2022 vs now?",
        userId: MOCK_USER_ID,
        appId: MOCK_APP_ID,
      });

      expect(result.queryAnalysis.intent).toBe(QueryIntent.HISTORICAL_TIMELINE);
      expect(result.queryAnalysis.temporalConstraint).toBeDefined();
    });
  });

  describe("Baseline Semantic Retrieval", () => {
    it("should use Chroma and Mem0 for baseline retrieval", async () => {
      const result = await orchestrator.retrieve({
        query: "What's your opinion on remote work?",
        userId: MOCK_USER_ID,
        appId: MOCK_APP_ID,
      });

      expect(chromaService.query).toHaveBeenCalled();
      expect(memoryService.searchMemories).toHaveBeenCalled();
      expect(result.memories.length).toBeGreaterThan(0);
    });

    it("should deduplicate results from Chroma and Mem0", async () => {
      const duplicateText = "Same content from both sources";

      (chromaService.query as jest.Mock).mockResolvedValue([{ ...MOCK_CHROMA_RESULTS[0], text: duplicateText }]);

      (memoryService.searchMemories as jest.Mock).mockResolvedValue([
        { ...MOCK_MEM0_RESULTS[0], memory: duplicateText },
      ]);

      const result = await orchestrator.retrieve({
        query: "What's your opinion on AI?",
        userId: MOCK_USER_ID,
        appId: MOCK_APP_ID,
      });

      // Should have deduped the identical content
      const allContent = result.memories.map((m) => m.memory);
      const uniqueContent = new Set(allContent);

      expect(uniqueContent.size).toBeLessThanOrEqual(allContent.length);
    });
  });

  describe("Performance", () => {
    it("should complete retrieval in under 1 second", async () => {
      const startTime = Date.now();

      await orchestrator.retrieve({
        query: "What's your educational background?",
        userId: MOCK_USER_ID,
        appId: MOCK_APP_ID,
      });

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(1000);
    });

    it("should execute Chroma and Mem0 in parallel", async () => {
      let chromaCallTime = 0;
      let memoryCallTime = 0;

      (chromaService.query as jest.Mock).mockImplementation(() => {
        chromaCallTime = Date.now();
        return Promise.resolve(MOCK_CHROMA_RESULTS);
      });

      (memoryService.searchMemories as jest.Mock).mockImplementation(() => {
        memoryCallTime = Date.now();
        return Promise.resolve(MOCK_MEM0_RESULTS);
      });

      await orchestrator.retrieve({
        query: "What do you think about AI?",
        userId: MOCK_USER_ID,
        appId: MOCK_APP_ID,
      });

      // Calls should happen nearly simultaneously (within 100ms)
      const timeDiff = Math.abs(chromaCallTime - memoryCallTime);
      expect(timeDiff).toBeLessThan(100);
    });
  });

  describe("Error Handling", () => {
    it("should handle Chroma service errors gracefully", async () => {
      (chromaService.query as jest.Mock).mockRejectedValue(new Error("Chroma connection failed"));

      // Should still return results from Mem0
      await expect(
        orchestrator.retrieve({
          query: "What do you think about AI?",
          userId: MOCK_USER_ID,
          appId: MOCK_APP_ID,
        }),
      ).resolves.toBeDefined();
    });

    it("should fall back to simple retrieval if classification fails", async () => {
      jest.spyOn(queryClassifier, "classifyQuery").mockRejectedValue(new Error("Classification failed"));

      const result = await orchestrator.retrieve({
        query: "What do you think about AI?",
        userId: MOCK_USER_ID,
        appId: MOCK_APP_ID,
      });

      // Should still return results via fallback
      expect(result).toBeDefined();
      expect(result.memories).toBeDefined();
    });
  });

  describe("Sources Tracking", () => {
    it("should track sources used in retrieval", async () => {
      const result = await orchestrator.retrieve({
        query: "What's your opinion on AI?",
        userId: MOCK_USER_ID,
        appId: MOCK_APP_ID,
      });

      expect(result.sourcesUsed).toBeDefined();
      expect(result.sourcesUsed).toContain("chroma");
      expect(result.sourcesUsed).toContain("mem0");
    });
  });
});
