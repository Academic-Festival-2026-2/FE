import { create } from "zustand";

type AppStore = {
  isNavOpen: boolean;
  toggleNav: () => void;
  closeNav: () => void;
};

export const useAppStore = create<AppStore>((set) => ({
  isNavOpen: false,
  toggleNav: () => set((state) => ({ isNavOpen: !state.isNavOpen })),
  closeNav: () => set({ isNavOpen: false }),
}));
