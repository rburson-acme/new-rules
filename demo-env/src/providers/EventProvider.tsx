import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { EventManager as EventManagerClass, Logger } from 'thredlib';

export const EventContext = createContext<EventManagerClass | null>(null);

export function EventProvider({ children, token }: { children: ReactNode; token: string }) {
  const eventManager = new EventManagerClass();

  const [successfulConnection, setSuccessfulConnection] = useState<boolean>(false);

  useEffect(() => {
    //connect
    eventManager
      .connect('localhost:3000', { transports: ['websocket'], jsonp: false, auth: { token } })
      .catch(e => {
        Logger.error(e);
      })
      .then(() => {
        setSuccessfulConnection(true);
      });
    return () => {
      eventManager.disconnect();
    };
  }, [eventManager]);

  if (!successfulConnection) return <p>Connecting to the event server...</p>;

  return <EventContext.Provider value={eventManager}>{children}</EventContext.Provider>;
}
