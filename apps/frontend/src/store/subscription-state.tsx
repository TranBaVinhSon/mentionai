import { create } from "zustand";
import { GengarSubscriptionPlan, gengarApi } from "@/services/api";

interface SubscriptionState {
  subscriptionPlan: GengarSubscriptionPlan | null;
  subscriptionPlanCancelAt: Date | null;
  fetchSubscriptionData: () => Promise<void>;
  clearSubscriptionData: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  subscriptionPlan: null,
  subscriptionPlanCancelAt: null,
  fetchSubscriptionData: async () => {
    try {
      const { subscriptionPlan, subscriptionPlanCancelAt } =
        await gengarApi.getProfile();
      set({ subscriptionPlan, subscriptionPlanCancelAt });
    } catch (error) {
      console.error("Failed to fetch subscription data:", error);
    }
  },
  clearSubscriptionData: () =>
    set({ subscriptionPlan: null, subscriptionPlanCancelAt: null }),
}));
