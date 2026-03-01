export interface Benchmark {
  [key: string]: string;
}

export interface ModelFeatures {
  reasoning: string;
  speed: string;
  supports_input: string[];
  supports_output: string[];
  reasoning_tokens: boolean;
  knowledge_cutoff: string;
  max_output_tokens?: string | number;
}

export interface Model {
  name: string;
  description: string;
  context_length: string;
  price_input_per_1M: string;
  price_output_per_1M: string;
  benchmarks: Benchmark;
  additional_features: ModelFeatures;
}

export type ViewMode = "cards" | "chart" | "table";
