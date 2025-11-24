import { createContext, ReactNode, useEffect, useRef, useState } from 'react';
import { EventManager as EventManagerClass, Logger } from 'thredlib';

export const EventContext = createContext<EventManagerClass | null>(null);

// Singleton instance outside React lifecycle
let eventManagerInstance: EventManagerClass | null = null;

function getEventManager() {
  if (!eventManagerInstance) {
    eventManagerInstance = new EventManagerClass();
  }
  return eventManagerInstance;
}

export function EventProvider({ children, token }: { children: ReactNode; token: string }) {
  const eventManager = useRef(getEventManager()).current;
  const [successfulConnection, setSuccessfulConnection] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    eventManager
      .connect('http://localhost:3000', { transports: ['websocket'], jsonp: false, auth: { token } })
      // .connect('http://135.237.67.131', { transports: ['websocket'], jsonp: false, auth: { token } })
      .catch(e => {
        if (!cancelled) {
          Logger.error(e);
        }
      })
      .then(() => {
        if (!cancelled) {
          setSuccessfulConnection(true);
        }
      });

    return () => {
      cancelled = true;
      setSuccessfulConnection(false);
      // Don't disconnect on cleanup - keep connection alive across remounts
    };
  }, [eventManager, token]);

  if (!successfulConnection) return <p>Connecting to the event server...</p>;

  return <EventContext.Provider value={eventManager}>{children}</EventContext.Provider>;
}
