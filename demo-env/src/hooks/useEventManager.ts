import { EventContext } from "@/providers/EventProvider";
import { useContext } from "react";

export function useEventManager() {
  const context = useContext(EventContext);

  if (!context) {
    throw new Error('useEventManager must be used within an EventProvider');
  }

  return context;
}
