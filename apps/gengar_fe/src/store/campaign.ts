import { create } from 'zustand';

interface CampaignState {
  remainingSlots: number;
  hasApplied: boolean;
  setRemainingSlots: (slots: number) => void;
  markAsApplied: () => void;
}

const TOTAL_SLOTS = 1000;
const INITIAL_USED_SLOTS = 237; // Starting number of used slots

export const useCampaignStore = create<CampaignState>()((set) => ({
  remainingSlots: TOTAL_SLOTS - INITIAL_USED_SLOTS,
  hasApplied: false,
  
  setRemainingSlots: (slots) => set({ remainingSlots: slots }),
  
  markAsApplied: () => set({ hasApplied: true }),
}));