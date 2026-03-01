import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { SocialNetworkType, SocialSource } from "@/services/api";

interface ConnectedSource {
  id: string | number;
  type: SocialNetworkType;
  username: string;
  createdAt?: string;
}

interface ConnectedSourcesState {
  // Temporary connected sources for create page (before saving to API)
  temporarySources: ConnectedSource[];
  // Sources being removed on edit page
  removedSourceIds: number[];
  // Actions
  addTemporarySource: (source: ConnectedSource) => void;
  removeTemporarySource: (id: string | number) => void;
  clearTemporarySources: () => void;
  markSourceForRemoval: (id: number) => void;
  unmarkSourceForRemoval: (id: number) => void;
  clearRemovedSources: () => void;
  getDisplaySources: (existingSources?: SocialSource[]) => ConnectedSource[];
}

export const useConnectedSourcesStore = create<ConnectedSourcesState>()(
  persist(
    (set, get) => ({
      temporarySources: [],
      removedSourceIds: [],
      
      addTemporarySource: (source) =>
        set((state) => ({
          temporarySources: [...state.temporarySources, source],
        })),
        
      removeTemporarySource: (id) =>
        set((state) => ({
          temporarySources: state.temporarySources.filter((s) => s.id !== id),
        })),
        
      clearTemporarySources: () => set({ temporarySources: [] }),
      
      markSourceForRemoval: (id) =>
        set((state) => ({
          removedSourceIds: [...state.removedSourceIds, id],
        })),
        
      unmarkSourceForRemoval: (id) =>
        set((state) => ({
          removedSourceIds: state.removedSourceIds.filter((i) => i !== id),
        })),
        
      clearRemovedSources: () => set({ removedSourceIds: [] }),
      
      // Get display sources combining existing and temporary, excluding removed
      getDisplaySources: (existingSources = []) => {
        const { temporarySources, removedSourceIds } = get();
        
        // Filter out removed sources from existing
        const filteredExisting = existingSources
          .filter((source) => !removedSourceIds.includes(source.id))
          .map((source) => ({
            id: source.id,
            type: source.type,
            username: source.username,
            createdAt: source.createdAt,
          }));
        
        // Combine with temporary sources
        return [...filteredExisting, ...temporarySources];
      },
    }),
    {
      name: "connected-sources-storage",
      storage: createJSONStorage(() => sessionStorage), // Use session storage so it clears on browser close
    }
  )
);