import { create } from "zustand";

interface LogoutState {
  isLoggedOut: boolean;
  setLoggedOut: (value: boolean) => void;
  resetLogoutState: () => void;
}

export const useLogoutStore = create<LogoutState>((set) => ({
  isLoggedOut: false,

  setLoggedOut: (value: boolean) => {
    console.log(`🔄 [LogoutStore] Setting logout state: ${value}`);
    set({ isLoggedOut: value });
  },

  resetLogoutState: () => {
    console.log("🧹 [LogoutStore] Resetting logout state");
    set({ isLoggedOut: false });
  },
}));
