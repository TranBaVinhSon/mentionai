import { create } from "zustand";
import { gengarApi, Model } from "@/services/api";

interface ModelStore {
  models: Model[];
  lastFetched: number | null;
  fetchModels: () => Promise<void>;
  getModels: () => Promise<Model[]>;
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export const useModelStore = create<ModelStore>((set, get) => ({
  models: [],
  lastFetched: null,
  fetchModels: async () => {
    const models = await gengarApi.getModels();
    set({ models, lastFetched: Date.now() });
  },
  getModels: async () => {
    const { models, lastFetched, fetchModels } = get();
    const now = Date.now();
    if (!models.length || !lastFetched || now - lastFetched > CACHE_DURATION) {
      await fetchModels();
    }
    return get().models;
  },
}));
