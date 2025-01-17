import { useEventManager } from '@/hooks/useEventManager';
import { EventProvider } from '@/providers/EventProvider';
import { MouseEvent, useEffect, useState } from 'react';
import { Event } from 'thredlib';

const defaultText = JSON.stringify(
  {
    type: 'org.wt.echo',
    data: {
      title: 'Echo Event',
      content: {
        values: {
          echoTitle: 'Echo Back Event',
          echoTo: ['participant0', 'participant1'],
          echoContent: {
            values: {
              exampleValue1: 'value1',
            },
          },
        },
      },
    },
  },
  null,
  2,
);

type EchoTestProps = {
  user: string;
  setUser: (user: string) => void;
};
export default function EchoTest({ user, setUser }: EchoTestProps) {
  const [text, setText] = useState(defaultText);
  const [queue, setQueue] = useState<any[]>([]);
  const [messages, setMessages] = useState<string[]>([]);

  const EventManager = useEventManager();

  function send(event: any) {
    const id = event.id || 'echo_' + Date.now();
    event.id = id;
    event.source = event?.source?.id ? { id: event.source.id } : { id: 'participant0' };
    EventManager.publish(event);
    console.log(event);
    return id;
  }

  function onSendClick(event: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) {
    event.preventDefault();
    try {
      const json = JSON.parse(text);
      send(json);
    } catch (e) {
      alert(e);
    }
  }

  function onQueueClick(e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) {
    e.preventDefault();
    const json = text;
    if (!json) alert('No JSON to Queue');
    try {
      if (Array.isArray(json)) {
        setQueue(queue.concat(json));
      } else {
        setQueue([...queue, json]);
        setText('');
      }
    } catch (e) {
      alert(e);
    }
  }

  function onSendNextClick(e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) {
    e.preventDefault();

    try {
      if (queue.length === 0) {
        setMessages([...messages, 'No Events in Queue']);
        return;
      }
      const nextQueueItem = queue[queue.length - 1];
      //adjust queue
      setQueue(queue.slice(0, queue.length - 1));
      const json = nextQueueItem;

      const sentId = send(JSON.parse(json));
      setMessages([...messages, 'Sent Event' + ' ' + sentId]);
    } catch (e) {
      alert(e);
    }
  }

  function onSwitchUserClick(e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) {
    e.preventDefault();
    const user = (document.getElementById('user') as HTMLInputElement)?.value;
    setUser(user);
  }

  useEffect(() => {
    EventManager.subscribe((event: Event) => {
      console.log('got subscription message');
      setMessages([...messages, JSON.stringify(event, null, 2)]);
    });
  }, []);

  return (
    <div className="w-full h-full p-5">
      <form className="bg-black p-1 w-full h-full text-center" action="">
        <div className="h-[70%] m-auto p-2">
          <textarea
            className="border-0 p-2 w-full h-[600px] text-black "
            placeholder="Paste JSON Here"
            autoComplete="off"
            spellCheck="false"
            onChange={e => setText(e.target.value)}
            value={text}
          />
        </div>
        <div className="h-[70%] m-auto p-2 gap-1 flex justify-center">
          <button className="bg-cyan-400 border-none p-2 text-black" onClick={onSendClick}>
            Send
          </button>
          <button className="bg-cyan-400 border-none p-2 text-black" onClick={onQueueClick}>
            Queue
          </button>
          <button className="bg-cyan-400 border-none p-2 text-black" onClick={onSendNextClick}>
            Send Next Queued
          </button>
        </div>
        <div className="h-[70%] m-auto p-2">
          <input className="border-none p-2 text-black" type="text" id="user" defaultValue={'participant0'} />
          <button className="bg-cyan-400 border-none p-2 text-black" onClick={onSwitchUserClick}>
            Switch User
          </button>
        </div>
      </form>
      <p>items in queue: {queue.length}</p>
      <ul id="messages" className="list-none m-0 p-0">
        {messages.map((message, i) => (
          <Message key={i} text={message} />
        ))}
      </ul>
    </div>
  );
}

function Message({ text }: { text: string }) {
  return <pre>{text}</pre>;
}
