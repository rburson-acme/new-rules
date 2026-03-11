import { Events, Event } from 'thredlib';
import { IncomingBroadcast } from './IncomingBroadcast';
import { OutgoingBroadcast } from './OutgoingBroadcast';
import { ErrorEvent } from './ErrorEvent';
import { TemplateEvent } from '@/features/template/components/TemplateEvent';

interface Props {
  event: Event;
}

export function EventItem({ event }: Props) {
  const data = event.data;
  if (!data) return null;

  const error = Events.getError(event);
  if (error) return <ErrorEvent error={error} />;

  const content = data.content;

  if (event.type === 'org.wt.broadcast' && content) {
    return <IncomingBroadcast content={content} time={event.time} />;
  }

  if (event.type === 'org.wt.client.broadcast' && content) {
    return <OutgoingBroadcast content={content} />;
  }

  // Template event (has advice with template)
  if (data.advice?.template) {
    return <TemplateEvent event={event} />;
  }

  // Fallback: display title/description
  return <IncomingBroadcast content={content ?? { values: data.title ?? '' }} time={event.time} />;
}
