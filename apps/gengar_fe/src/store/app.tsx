import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  isSignInDialog: boolean;
  isSubscriptionDialog: boolean;
  isCancelSubscriptionDialog: boolean;
  isSidebarOpen: boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isSignInDialog: false,
      isSubscriptionDialog: false,
      isCancelSubscriptionDialog: false,
      isSidebarOpen: false,
    }),
    {
      name: "app-store",
      partialize: (state) => ({ isSidebarOpen: state.isSidebarOpen }),
    }
  )
);

export const setSignInDialog = (isSignInDialog: boolean) => {
  useAppStore.setState({ isSignInDialog });
};

export const setSubscriptionDialog = (isSubscriptionDialog: boolean) => {
  useAppStore.setState({ isSubscriptionDialog });
};

export const setCancelSubscriptionDialog = (
  isCancelSubscriptionDialog: boolean
) => {
  useAppStore.setState({ isCancelSubscriptionDialog });
};

export const setSidebarOpen = (isSidebarOpen: boolean) => {
  useAppStore.setState({ isSidebarOpen });
};
