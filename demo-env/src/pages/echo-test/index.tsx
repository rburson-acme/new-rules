import EchoTest from '@/components/echo-test/EchoTest';
import { EventProvider } from '@/providers/EventProvider';
import { useState } from 'react';

export default function EchoTestPage() {
  const [user, setUser] = useState<string>('participant0');

  return (
    <EventProvider token={user}>
      <EchoTest user={user} setUser={setUser} />
    </EventProvider>
  );
}
