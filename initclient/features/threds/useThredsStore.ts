import { create } from 'zustand';

export type ThredTab = 'active' | 'completed' | 'archived';

interface ThredsState {
  activeTab: ThredTab;
  searchQuery: string;
  setActiveTab: (tab: ThredTab) => void;
  setSearchQuery: (query: string) => void;
}

export const useThredsStore = create<ThredsState>((set) => ({
  activeTab: 'active',
  searchQuery: '',
  setActiveTab: (activeTab) => set({ activeTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
