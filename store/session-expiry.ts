import { create } from "zustand";

interface SessionExpiryState {
  error401Count: number;
  lastErrorTime: number;
  showExpiryDialog: boolean;
  maxErrors: number;
  errorWindowMs: number;
  report401Error: () => void;
  resetErrors: () => void;
  hideDialog: () => void;
}

const MAX_401_ERRORS = 3;
const ERROR_WINDOW_MS = 30000; // 30 secondi

export const useSessionExpiryStore = create<SessionExpiryState>((set, get) => ({
  error401Count: 0,
  lastErrorTime: 0,
  showExpiryDialog: false,
  maxErrors: MAX_401_ERRORS,
  errorWindowMs: ERROR_WINDOW_MS,

  report401Error: () => {
    const state = get();
    const now = Date.now();

    // Reset counter se è passato troppo tempo dall'ultimo errore
    let newCount = state.error401Count;
    if (now - state.lastErrorTime > ERROR_WINDOW_MS) {
      newCount = 0;
    }

    newCount++;

    console.log(
      `[SessionExpiry] 401 error count: ${newCount}/${MAX_401_ERRORS}`
    );

    const shouldShowDialog = newCount >= MAX_401_ERRORS;
    if (shouldShowDialog) {
      console.log(
        `[SessionExpiry] Max 401 errors reached, showing expiry dialog`
      );
    }

    set({
      error401Count: newCount,
      lastErrorTime: now,
      showExpiryDialog: shouldShowDialog,
    });
  },

  resetErrors: () => {
    set({
      error401Count: 0,
      lastErrorTime: 0,
      showExpiryDialog: false,
    });
  },

  hideDialog: () => {
    set({ showExpiryDialog: false });
  },
}));
