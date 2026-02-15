import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChatState {
  isAnonymous: boolean;
  isAiEditing: boolean;
  isWebSearchEnabled: boolean;
  isDebateMode: boolean;
  isDeepThinkMode: boolean;
  setIsAnonymous: (isAnonymous: boolean) => void;
  setIsAiEditing: (isAiEditing: boolean) => void;
  setIsWebSearchEnabled: (isWebSearchEnabled: boolean) => void;
  setIsDebateMode: (isDebateMode: boolean) => void;
  setIsDeepThinkMode: (isDeepThinkMode: boolean) => void;
}

export const useChatStore = create(
  persist<ChatState>(
    (set) => ({
      isAnonymous: false,
      isAiEditing: false,
      isWebSearchEnabled: false,
      isDebateMode: false,
      isDeepThinkMode: false,
      setIsAnonymous: (isAnonymous) => set({ isAnonymous }),
      setIsAiEditing: (isAiEditing) => set({ isAiEditing }),
      setIsWebSearchEnabled: (isWebSearchEnabled) =>
        set({ isWebSearchEnabled }),
      setIsDebateMode: (isDebateMode) => set({ isDebateMode }),
      setIsDeepThinkMode: (isDeepThinkMode) => set({ isDeepThinkMode }),
    }),
    {
      name: "chat-store",
    }
  )
);

export const toggleAnonymous = () => {
  const { isAnonymous, setIsAnonymous } = useChatStore.getState();
  setIsAnonymous(!isAnonymous);
};

export const toggleAiEditing = () => {
  const { isAiEditing, setIsAiEditing } = useChatStore.getState();
  setIsAiEditing(!isAiEditing);
};

export const toggleWebSearch = () => {
  const { isWebSearchEnabled, setIsWebSearchEnabled } = useChatStore.getState();
  setIsWebSearchEnabled(!isWebSearchEnabled);
};

export const toggleDebateMode = () => {
  const { isDebateMode, setIsDebateMode } = useChatStore.getState();
  setIsDebateMode(!isDebateMode);
};

export const toggleDeepThinkMode = () => {
  const { isDeepThinkMode, setIsDeepThinkMode } = useChatStore.getState();
  setIsDeepThinkMode(!isDeepThinkMode);
};
