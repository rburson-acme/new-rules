import { create } from 'zustand';
import { Event, Logger } from 'thredlib';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { eventManagerClient } from './eventManagerClient';
import { SERVER_URL } from '@/lib/env';

interface ConnectionState {
  hasConnection: boolean;
  connect: (userId: string) => Promise<void>;
  disconnect: () => void;
  publish: (event: Event) => void;
  exchange: (event: Event, notifyFn: (event: Event) => void) => void;
  subscribeToWatchThreds: (
    notifyFn: (event: Event) => void,
    watchThredsEventId: string,
  ) => () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  hasConnection: false,

  connect: async (userId: string) => {
    if (get().hasConnection) return;
    try {
      await eventManagerClient.connect(SERVER_URL, {
        transports: ['websocket'],
        jsonp: false,
        auth: { token: userId },
      });
      set({ hasConnection: true });
    } catch (e) {
      Logger.error(e as Error);
    }
  },

  disconnect: () => {
    if (!get().hasConnection) return;
    eventManagerClient.disconnect();
    set({ hasConnection: false });
  },

  publish: (event: Event) => eventManagerClient.publish(event),

  exchange: (event: Event, notifyFn: (event: Event) => void) =>
    eventManagerClient.exchange(event, notifyFn),

  subscribeToWatchThreds: (notifyFn, watchThredsEventId) => {
    eventManagerClient.subscribe(notifyFn, {
      filter: `$event.re = '${watchThredsEventId}'`,
    });
    return () => {};
  },
}));

/** Schedule a local notification for an inbound event when the app is backgrounded. */
export async function maybeNotify(event: Event) {
  if (AppState.currentState === 'active' || Platform.OS === 'web') return;
  const values = event.data?.content?.values;
  const body =
    typeof values === 'string' ? values : values ? JSON.stringify(values) : 'You have a new event.';
  await Notifications.scheduleNotificationAsync({
    content: { title: event.data?.title ?? 'New Event', body, data: { eventId: event.id } },
    trigger: null,
  });
}
