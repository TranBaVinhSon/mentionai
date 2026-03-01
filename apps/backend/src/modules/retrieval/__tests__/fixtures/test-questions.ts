/**
 * Test questions from evaluation/questions.csv
 * Organized by category with expected intent classification
 */

export interface TestQuestion {
  id: string;
  category: string;
  question: string;
  expectedIntent: string;
  expectedEntities?: string[];
  expectedTemporal?: {
    recency: "recent" | "historical" | "any";
    recencyDays?: number;
  };
  expectedConfidenceRequired: "high" | "medium" | "low";
  requiresPrivateInfo: boolean;
}

export const FACTUAL_ACCURACY_QUESTIONS: TestQuestion[] = [
  {
    id: "fact_01",
    category: "factual_accuracy",
    question: "What's your educational background?",
    expectedIntent: "factual_lookup",
    expectedEntities: ["educational", "background"],
    expectedConfidenceRequired: "high",
    requiresPrivateInfo: false,
  },
  {
    id: "fact_02",
    category: "factual_accuracy",
    question: "Where did you work before your current role?",
    expectedIntent: "factual_lookup",
    expectedEntities: ["work", "role"],
    expectedConfidenceRequired: "high",
    requiresPrivateInfo: false,
  },
  {
    id: "fact_03",
    category: "factual_accuracy",
    question: "What projects have you launched?",
    expectedIntent: "factual_lookup",
    expectedEntities: ["projects", "launched"],
    expectedConfidenceRequired: "high",
    requiresPrivateInfo: false,
  },
  {
    id: "fact_04",
    category: "factual_accuracy",
    question: "What cities have you lived in?",
    expectedIntent: "factual_lookup",
    expectedEntities: ["cities", "lived"],
    expectedConfidenceRequired: "high",
    requiresPrivateInfo: false,
  },
  {
    id: "fact_05",
    category: "factual_accuracy",
    question: "When did you start posting about AI?",
    expectedIntent: "factual_lookup",
    expectedEntities: ["posting", "AI"],
    expectedConfidenceRequired: "high",
    requiresPrivateInfo: false,
  },
  {
    id: "fact_06",
    category: "factual_accuracy",
    question: "What did you post about last week?",
    expectedIntent: "recent_events",
    expectedEntities: ["post"],
    expectedTemporal: {
      recency: "recent",
      recencyDays: 7,
    },
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "fact_07",
    category: "factual_accuracy",
    question: "What was your most recent article about?",
    expectedIntent: "recent_events",
    expectedEntities: ["recent", "article"],
    expectedTemporal: {
      recency: "recent",
    },
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "fact_08",
    category: "factual_accuracy",
    question: "What's the latest project you announced?",
    expectedIntent: "recent_events",
    expectedEntities: ["latest", "project", "announced"],
    expectedTemporal: {
      recency: "recent",
    },
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
];

export const HALLUCINATION_DETECTION_QUESTIONS: TestQuestion[] = [
  {
    id: "hallucination_01",
    category: "hallucination_detection",
    question: "What did you have for breakfast today?",
    expectedIntent: "uncertainty_test",
    expectedEntities: ["breakfast"],
    expectedConfidenceRequired: "high",
    requiresPrivateInfo: true,
  },
  {
    id: "hallucination_02",
    category: "hallucination_detection",
    question: "What's your private opinion on Elon Musk?",
    expectedIntent: "uncertainty_test",
    expectedEntities: ["opinion", "Elon", "Musk"],
    expectedConfidenceRequired: "high",
    requiresPrivateInfo: true,
  },
  {
    id: "hallucination_03",
    category: "hallucination_detection",
    question: "Tell me about your conversation with Sam Altman last month",
    expectedIntent: "uncertainty_test",
    expectedEntities: ["conversation", "Sam", "Altman"],
    expectedConfidenceRequired: "high",
    requiresPrivateInfo: true,
  },
  {
    id: "hallucination_04",
    category: "hallucination_detection",
    question: "What are you working on that you haven't announced yet?",
    expectedIntent: "uncertainty_test",
    expectedEntities: ["working"],
    expectedConfidenceRequired: "high",
    requiresPrivateInfo: true,
  },
  {
    id: "hallucination_05",
    category: "hallucination_detection",
    question: "Remember when we met at TechCrunch Disrupt?",
    expectedIntent: "uncertainty_test",
    expectedEntities: ["met", "TechCrunch", "Disrupt"],
    expectedConfidenceRequired: "high",
    requiresPrivateInfo: true,
  },
  {
    id: "hallucination_06",
    category: "hallucination_detection",
    question: "What did you think about the recent AI regulation bill?",
    expectedIntent: "uncertainty_test",
    expectedEntities: ["AI", "regulation", "bill"],
    expectedConfidenceRequired: "high",
    requiresPrivateInfo: false,
  },
  {
    id: "hallucination_07",
    category: "hallucination_detection",
    question: "How was your trip to Tokyo?",
    expectedIntent: "uncertainty_test",
    expectedEntities: ["trip", "Tokyo"],
    expectedConfidenceRequired: "high",
    requiresPrivateInfo: true,
  },
];

export const TEMPORAL_AWARENESS_QUESTIONS: TestQuestion[] = [
  {
    id: "temporal_01",
    category: "temporal_awareness",
    question: "What was your opinion on AI in 2022 vs now?",
    expectedIntent: "historical_timeline",
    expectedEntities: ["opinion", "AI", "2022"],
    expectedTemporal: {
      recency: "historical",
    },
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "temporal_02",
    category: "temporal_awareness",
    question: "How has your content evolved over the past year?",
    expectedIntent: "historical_timeline",
    expectedEntities: ["content", "evolved", "year"],
    expectedTemporal: {
      recency: "historical",
    },
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "temporal_03",
    category: "temporal_awareness",
    question: "What were you focused on before starting your company?",
    expectedIntent: "historical_timeline",
    expectedEntities: ["focused", "company"],
    expectedTemporal: {
      recency: "historical",
    },
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
];

export const ANALYTICS_QUESTIONS: TestQuestion[] = [
  {
    id: "search_04",
    category: "search_retrieval",
    question: "What topics do you post about most?",
    expectedIntent: "analytics_query",
    expectedEntities: ["topics", "post", "most"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "search_05",
    category: "search_retrieval",
    question: "What's your most popular content about AI?",
    expectedIntent: "analytics_query",
    expectedEntities: ["popular", "content", "AI"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "search_06",
    category: "search_retrieval",
    question: "How has your posting frequency changed?",
    expectedIntent: "analytics_query",
    expectedEntities: ["posting", "frequency", "changed"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
];

export const CONTENT_SEARCH_QUESTIONS: TestQuestion[] = [
  {
    id: "search_01",
    category: "search_retrieval",
    question: "Find all your posts about machine learning",
    expectedIntent: "content_search",
    expectedEntities: ["posts", "machine", "learning"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "search_02",
    category: "search_retrieval",
    question: "What did you say about GPT-4 when it first emerged?",
    expectedIntent: "content_search",
    expectedEntities: ["GPT-4", "emerged"],
    expectedTemporal: {
      recency: "historical",
    },
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "search_03",
    category: "search_retrieval",
    question: "Show me your thoughts on remote work over time",
    expectedIntent: "content_search",
    expectedEntities: ["thoughts", "remote", "work"],
    expectedTemporal: {
      recency: "any",
    },
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
];

export const PERSONALITY_QUESTIONS: TestQuestion[] = [
  {
    id: "personality_01",
    category: "personality_voice",
    question: "Explain AI to a 5-year-old",
    expectedIntent: "personality_query",
    expectedEntities: ["explain", "AI"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "personality_02",
    category: "personality_voice",
    question: "What's your take on remote work?",
    expectedIntent: "opinion_query",
    expectedEntities: ["take", "remote", "work"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "personality_03",
    category: "personality_voice",
    question: "Tell me about a failure you've had",
    expectedIntent: "story_request",
    expectedEntities: ["failure"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "personality_04",
    category: "personality_voice",
    question: "What advice would you give to someone starting out?",
    expectedIntent: "personality_query",
    expectedEntities: ["advice", "starting"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "personality_05",
    category: "personality_voice",
    question: "What makes you excited?",
    expectedIntent: "personality_query",
    expectedEntities: ["excited"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "personality_06",
    category: "personality_voice",
    question: "What frustrates you about your industry?",
    expectedIntent: "personality_query",
    expectedEntities: ["frustrates", "industry"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "personality_07",
    category: "personality_voice",
    question: "Tell me about something you're proud of",
    expectedIntent: "story_request",
    expectedEntities: ["proud"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
];

export const CASUAL_CONVERSATION_QUESTIONS: TestQuestion[] = [
  {
    id: "conv_01",
    category: "conversational_flow",
    question: "Hey! How's your day going?",
    expectedIntent: "casual_conversation",
    expectedEntities: [],
    expectedConfidenceRequired: "low",
    requiresPrivateInfo: false,
  },
  {
    id: "conv_02",
    category: "conversational_flow",
    question: "I'm struggling with scalability issues. Any quick thoughts?",
    expectedIntent: "casual_conversation",
    expectedEntities: ["scalability", "issues"],
    expectedConfidenceRequired: "low",
    requiresPrivateInfo: false,
  },
  {
    id: "conv_03",
    category: "conversational_flow",
    question: "Lol that's interesting. Tell me more about that",
    expectedIntent: "casual_conversation",
    expectedEntities: [],
    expectedConfidenceRequired: "low",
    requiresPrivateInfo: false,
  },
  {
    id: "conv_04",
    category: "conversational_flow",
    question: "What's something random you've been thinking about lately?",
    expectedIntent: "casual_conversation",
    expectedEntities: ["thinking"],
    expectedConfidenceRequired: "low",
    requiresPrivateInfo: false,
  },
  {
    id: "conv_05",
    category: "conversational_flow",
    question: "Haha that's so true! What else?",
    expectedIntent: "casual_conversation",
    expectedEntities: [],
    expectedConfidenceRequired: "low",
    requiresPrivateInfo: false,
  },
];

export const OPINION_QUESTIONS: TestQuestion[] = [
  {
    id: "opinion_01",
    category: "opinion_consistency",
    question: "What's your stance on AI safety?",
    expectedIntent: "opinion_query",
    expectedEntities: ["stance", "AI", "safety"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "opinion_02",
    category: "opinion_consistency",
    question: "Do you still think remote work is the future or has your view changed?",
    expectedIntent: "opinion_query",
    expectedEntities: ["remote", "work", "view", "changed"],
    expectedTemporal: {
      recency: "any",
    },
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "opinion_03",
    category: "opinion_consistency",
    question: "Why do you prefer TypeScript over JavaScript?",
    expectedIntent: "opinion_query",
    expectedEntities: ["prefer", "TypeScript", "JavaScript"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "opinion_04",
    category: "opinion_consistency",
    question: "What's your position on crypto adoption?",
    expectedIntent: "opinion_query",
    expectedEntities: ["position", "crypto", "adoption"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
];

export const STORY_QUESTIONS: TestQuestion[] = [
  {
    id: "story_01",
    category: "storytelling_engagement",
    question: "Tell me about a time when you completely changed your mind about something",
    expectedIntent: "story_request",
    expectedEntities: ["changed", "mind"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "story_02",
    category: "storytelling_engagement",
    question: "What's the weirdest thing that's happened to you recently?",
    expectedIntent: "story_request",
    expectedEntities: ["weirdest", "happened"],
    expectedTemporal: {
      recency: "recent",
    },
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "story_03",
    category: "storytelling_engagement",
    question: "Walk me through how you typically start your day",
    expectedIntent: "story_request",
    expectedEntities: ["start", "day"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "story_04",
    category: "storytelling_engagement",
    question: "What's something you learned the hard way?",
    expectedIntent: "story_request",
    expectedEntities: ["learned"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "story_05",
    category: "storytelling_engagement",
    question: "If you could go back and give your younger self one piece of advice, what would it be?",
    expectedIntent: "story_request",
    expectedEntities: ["advice", "younger"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
];

export const CONTENT_INTERACTION_QUESTIONS: TestQuestion[] = [
  {
    id: "content_01",
    category: "content_interaction",
    question: "Can you summarize your recent LinkedIn posts for me?",
    expectedIntent: "content_summary",
    expectedEntities: ["summarize", "LinkedIn", "posts"],
    expectedTemporal: {
      recency: "recent",
    },
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "content_02",
    category: "content_interaction",
    question: "Which of your posts got the most engagement recently and why do you think that happened?",
    expectedIntent: "analytics_query",
    expectedEntities: ["posts", "engagement", "recently"],
    expectedTemporal: {
      recency: "recent",
    },
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "content_03",
    category: "content_interaction",
    question: "I saw your post about AI ethics. What inspired you to write that?",
    expectedIntent: "content_backstory",
    expectedEntities: ["post", "AI", "ethics", "inspired"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "content_04",
    category: "content_interaction",
    question: "Break down your thoughts on distributed systems in simple terms",
    expectedIntent: "content_explanation",
    expectedEntities: ["thoughts", "distributed", "systems"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "content_05",
    category: "content_interaction",
    question: "What's the main takeaway someone should get from your content?",
    expectedIntent: "content_synthesis",
    expectedEntities: ["takeaway", "content"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
];

export const SOCIAL_REACTIONS_QUESTIONS: TestQuestion[] = [
  {
    id: "social_01",
    category: "social_reactions",
    question: "What do you think about the recent OpenAI developments?",
    expectedIntent: "opinion_query",
    expectedEntities: ["OpenAI", "developments"],
    expectedTemporal: {
      recency: "recent",
    },
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "social_02",
    category: "social_reactions",
    question: "Everyone's talking about LLM improvements. Your take?",
    expectedIntent: "opinion_query",
    expectedEntities: ["LLM", "improvements"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "social_03",
    category: "social_reactions",
    question: "I just saw AI regulations are being discussed. This changes everything, right?",
    expectedIntent: "opinion_query",
    expectedEntities: ["AI", "regulations"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "social_04",
    category: "social_reactions",
    question: "Hot take: AI will replace most programmers in 5 years. Agree or disagree?",
    expectedIntent: "opinion_query",
    expectedEntities: ["AI", "replace", "programmers"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
];

export const PERSONALITY_QUIRKS_QUESTIONS: TestQuestion[] = [
  {
    id: "quirk_01",
    category: "personality_quirks",
    question: "What's your unpopular opinion about software development?",
    expectedIntent: "opinion_query",
    expectedEntities: ["unpopular", "opinion", "software", "development"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "quirk_02",
    category: "personality_quirks",
    question: "What's something everyone thinks is important but you think is overrated?",
    expectedIntent: "opinion_query",
    expectedEntities: ["important", "overrated"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "quirk_03",
    category: "personality_quirks",
    question: "What makes you laugh?",
    expectedIntent: "personality_query",
    expectedEntities: ["laugh"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "quirk_04",
    category: "personality_quirks",
    question: "What's your biggest pet peeve?",
    expectedIntent: "personality_query",
    expectedEntities: ["pet", "peeve"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
  {
    id: "quirk_05",
    category: "personality_quirks",
    question: "If you had to describe yourself in three words, what would they be?",
    expectedIntent: "personality_query",
    expectedEntities: ["describe", "three", "words"],
    expectedConfidenceRequired: "medium",
    requiresPrivateInfo: false,
  },
];

// Combined list for easy iteration
export const ALL_TEST_QUESTIONS: TestQuestion[] = [
  ...FACTUAL_ACCURACY_QUESTIONS,
  ...HALLUCINATION_DETECTION_QUESTIONS,
  ...TEMPORAL_AWARENESS_QUESTIONS,
  ...ANALYTICS_QUESTIONS,
  ...CONTENT_SEARCH_QUESTIONS,
  ...PERSONALITY_QUESTIONS,
  ...CASUAL_CONVERSATION_QUESTIONS,
  ...OPINION_QUESTIONS,
  ...STORY_QUESTIONS,
  ...CONTENT_INTERACTION_QUESTIONS,
  ...SOCIAL_REACTIONS_QUESTIONS,
  ...PERSONALITY_QUIRKS_QUESTIONS,
];
