import { createContext, useContext } from 'react';

interface HoverState {
  hoveredId: string | null;
  highlightedIds: Set<string>;
  searchIds: Set<string> | null;
}

export const HoverContext = createContext<HoverState>({
  hoveredId: null,
  highlightedIds: new Set(),
  searchIds: null,
});

export const useHoverState = () => useContext(HoverContext);
