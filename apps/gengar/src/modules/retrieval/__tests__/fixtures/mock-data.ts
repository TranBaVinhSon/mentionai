/**
 * Mock data for testing RetrievalOrchestratorService
 * Simulates social content, memories, and other data sources
 */

import { SocialContentSource } from "../../../../db/entities/social-content.entity";

export const MOCK_USER_ID = 1;
export const MOCK_APP_ID = 100;

/**
 * Mock social content representing user's posts
 */
export const MOCK_SOCIAL_CONTENT = [
  // Educational background
  {
    id: 1,
    appId: MOCK_APP_ID,
    content: "Graduated from Stanford University with a degree in Computer Science in 2018",
    source: SocialContentSource.LINKEDIN,
    type: "post",
    socialContentCreatedAt: new Date("2020-01-15"),
    metadata: { category: "education", likes: 45 },
  },
  {
    id: 2,
    appId: MOCK_APP_ID,
    content: "Studied machine learning at MIT during my master's program",
    source: SocialContentSource.LINKEDIN,
    type: "post",
    socialContentCreatedAt: new Date("2019-06-20"),
    metadata: { category: "education" },
  },

  // Work experience
  {
    id: 3,
    appId: MOCK_APP_ID,
    content: "Excited to announce I'm joining Google as a Senior Software Engineer!",
    source: SocialContentSource.LINKEDIN,
    type: "post",
    socialContentCreatedAt: new Date("2021-03-10"),
    metadata: { category: "work_experience", likes: 234 },
  },
  {
    id: 4,
    appId: MOCK_APP_ID,
    content: "After 3 amazing years at Microsoft, I'm moving on to new challenges",
    source: SocialContentSource.LINKEDIN,
    type: "post",
    socialContentCreatedAt: new Date("2021-02-28"),
    metadata: { category: "work_experience" },
  },
  {
    id: 5,
    appId: MOCK_APP_ID,
    content: "Started my career as a junior developer at a startup in San Francisco",
    source: SocialContentSource.TWITTER,
    type: "post",
    socialContentCreatedAt: new Date("2018-07-01"),
    metadata: { category: "work_experience" },
  },

  // Projects
  {
    id: 6,
    appId: MOCK_APP_ID,
    content: "Just launched my new project: an AI-powered code review tool called CodeSense",
    source: SocialContentSource.TWITTER,
    type: "post",
    socialContentCreatedAt: new Date("2023-09-15"),
    metadata: { category: "projects", likes: 567, shares: 89 },
  },
  {
    id: 7,
    appId: MOCK_APP_ID,
    content: "Built a RAG application for document search using LangChain and Chroma",
    source: SocialContentSource.LINKEDIN,
    type: "post",
    socialContentCreatedAt: new Date("2023-11-20"),
    metadata: { category: "projects" },
  },

  // Locations
  {
    id: 8,
    appId: MOCK_APP_ID,
    content: "Just moved to New York City! Excited for this new chapter",
    source: SocialContentSource.TWITTER,
    type: "post",
    socialContentCreatedAt: new Date("2022-06-01"),
    metadata: { category: "location" },
  },
  {
    id: 9,
    appId: MOCK_APP_ID,
    content: "Missing San Francisco but loving the NYC tech scene",
    source: SocialContentSource.TWITTER,
    type: "post",
    socialContentCreatedAt: new Date("2022-08-15"),
    metadata: { category: "location" },
  },

  // Recent posts about AI (last week)
  {
    id: 10,
    appId: MOCK_APP_ID,
    content: "GPT-4 is absolutely mind-blowing. The reasoning capabilities are a huge leap forward from GPT-3.5",
    source: SocialContentSource.TWITTER,
    type: "post",
    socialContentCreatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    metadata: { topics: ["AI", "GPT-4"], likes: 1234, comments: 56 },
  },
  {
    id: 11,
    appId: MOCK_APP_ID,
    content: "Working on integrating Claude 3 into our production systems. The quality is impressive!",
    source: SocialContentSource.LINKEDIN,
    type: "post",
    socialContentCreatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    metadata: { topics: ["AI", "Claude"], likes: 345 },
  },
  {
    id: 12,
    appId: MOCK_APP_ID,
    content: "Hot take: Retrieval-Augmented Generation (RAG) is going to be more important than fine-tuning",
    source: SocialContentSource.TWITTER,
    type: "post",
    socialContentCreatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    metadata: { topics: ["AI", "RAG"], likes: 890, shares: 123 },
  },

  // Older AI posts
  {
    id: 13,
    appId: MOCK_APP_ID,
    content: "My thoughts on AI safety: we need more researchers focused on alignment",
    source: SocialContentSource.LINKEDIN,
    type: "article",
    socialContentCreatedAt: new Date("2022-05-10"),
    metadata: { topics: ["AI", "safety", "alignment"], likes: 456 },
  },
  {
    id: 14,
    appId: MOCK_APP_ID,
    content: "Started posting about AI and machine learning after completing my ML course at MIT",
    source: SocialContentSource.TWITTER,
    type: "post",
    socialContentCreatedAt: new Date("2019-09-01"),
    metadata: { topics: ["AI", "machine learning"] },
  },

  // Remote work opinions
  {
    id: 15,
    appId: MOCK_APP_ID,
    content:
      "I'm a huge fan of remote work. The flexibility and productivity gains are real. But you need strong async communication.",
    source: SocialContentSource.LINKEDIN,
    type: "post",
    socialContentCreatedAt: new Date("2021-11-10"),
    metadata: { topics: ["remote work", "productivity"], likes: 234 },
  },
  {
    id: 16,
    appId: MOCK_APP_ID,
    content: "Remote work has changed my life. No more 2-hour commutes!",
    source: SocialContentSource.TWITTER,
    type: "post",
    socialContentCreatedAt: new Date("2020-05-15"),
    metadata: { topics: ["remote work"] },
  },

  // Machine learning posts
  {
    id: 17,
    appId: MOCK_APP_ID,
    content: "Deep dive into transformers architecture and attention mechanisms",
    source: SocialContentSource.LINKEDIN,
    type: "article",
    socialContentCreatedAt: new Date("2023-02-20"),
    metadata: { topics: ["machine learning", "transformers"], likes: 678 },
  },
  {
    id: 18,
    appId: MOCK_APP_ID,
    content: "Machine learning is eating the world. Every company will be an ML company.",
    source: SocialContentSource.TWITTER,
    type: "post",
    socialContentCreatedAt: new Date("2022-08-05"),
    metadata: { topics: ["machine learning"], likes: 345 },
  },

  // TypeScript preference
  {
    id: 19,
    appId: MOCK_APP_ID,
    content:
      "Why I prefer TypeScript over JavaScript: type safety catches bugs before runtime, better IDE support, and clearer code intent",
    source: SocialContentSource.LINKEDIN,
    type: "article",
    socialContentCreatedAt: new Date("2023-01-15"),
    metadata: { topics: ["TypeScript", "JavaScript"], likes: 456 },
  },
];

/**
 * Mock Chroma results
 */
export const MOCK_CHROMA_RESULTS = [
  {
    id: "chroma_1",
    text: "Graduated from Stanford University with a CS degree",
    score: 0.92,
    metadata: { appId: MOCK_APP_ID, userId: MOCK_USER_ID, source: "linkedin" },
    createdAt: new Date("2020-01-15").toISOString(),
  },
  {
    id: "chroma_2",
    text: "Working on AI safety and alignment research",
    score: 0.88,
    metadata: { appId: MOCK_APP_ID, userId: MOCK_USER_ID, source: "twitter" },
    createdAt: new Date("2022-05-10").toISOString(),
  },
  {
    id: "chroma_3",
    text: "Recently launched CodeSense, an AI code review tool",
    score: 0.85,
    metadata: { appId: MOCK_APP_ID, userId: MOCK_USER_ID, source: "twitter" },
    createdAt: new Date("2023-09-15").toISOString(),
  },
];

/**
 * Mock Mem0 results
 */
export const MOCK_MEM0_RESULTS = [
  {
    id: "mem0_1",
    memory: "User has a strong preference for TypeScript over JavaScript due to type safety",
    score: 0.89,
    metadata: { appId: MOCK_APP_ID, source: "linkedin" },
    created_at: new Date("2023-01-15").toISOString(),
  },
  {
    id: "mem0_2",
    memory: "User is passionate about AI safety and alignment",
    score: 0.87,
    metadata: { appId: MOCK_APP_ID, source: "linkedin" },
    created_at: new Date("2022-05-10").toISOString(),
  },
  {
    id: "mem0_3",
    memory: "User loves remote work and values flexibility",
    score: 0.84,
    metadata: { appId: MOCK_APP_ID, source: "linkedin" },
    created_at: new Date("2021-11-10").toISOString(),
  },
];

/**
 * Expected retrieval results for specific test cases
 */
export const EXPECTED_RESULTS = {
  // "What's your educational background?"
  education: {
    minResults: 2,
    requiredContent: ["Stanford", "Computer Science", "MIT", "machine learning"],
    confidenceLevel: "high",
  },

  // "Where did you work?"
  work: {
    minResults: 3,
    requiredContent: ["Google", "Microsoft", "Senior Software Engineer"],
    confidenceLevel: "high",
  },

  // "What projects have you launched?"
  projects: {
    minResults: 2,
    requiredContent: ["CodeSense", "RAG application", "LangChain"],
    confidenceLevel: "high",
  },

  // "What did you post about AI last week?"
  recentAI: {
    minResults: 3,
    requiredContent: ["GPT-4", "Claude", "RAG"],
    confidenceLevel: "high",
    recencyCheck: true, // All results should be within last 7 days
  },

  // "What topics do you post most about?"
  topicFrequency: {
    minResults: 1,
    requiredContent: ["AI", "machine learning"],
    confidenceLevel: "medium",
    isAnalytics: true,
  },

  // "What's your stance on remote work?"
  remoteWorkOpinion: {
    minResults: 2,
    requiredContent: ["remote work", "flexibility", "productivity"],
    confidenceLevel: "medium",
  },

  // "What did you have for breakfast?" (hallucination test)
  breakfast: {
    minResults: 0,
    confidenceLevel: "none",
    shouldReturnEmpty: true,
  },

  // "What was your opinion on AI in 2022 vs now?"
  temporalComparison: {
    minResults: 2,
    requiredContent: ["AI", "safety"],
    confidenceLevel: "medium",
    hasTemporalConstraint: true,
  },
};
