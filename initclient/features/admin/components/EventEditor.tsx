import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Event } from 'thredlib';
import { useConnectionStore } from '@/features/connection/useConnectionStore';

const DEFAULT_EVENT_JSON = JSON.stringify(
  {
    type: 'org.wt.echo',
    id: 'echo_' + Date.now(),
    source: { id: 'echo_' + Date.now() },
    data: {
      title: 'Echo Event',
      advice: {
        eventType: 'wonkaInc.operator',
        title: 'Work order needed?',
        template: {
          name: 'operator_create_workorder',
          interactions: [
            {
              interaction: {
                content: [
                  {
                    input: {
                      name: 'technician_response',
                      type: 'boolean',
                      display: 'Are you available to accept the work order?',
                      set: [
                        { display: 'Yes, I can accept', value: true },
                        { display: 'No, not right now', value: false },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      content: { values: { echoTitle: 'Echo Back Event' } },
    },
  },
  null,
  2,
);

export function EventEditor() {
  const [text, setText] = useState(DEFAULT_EVENT_JSON);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<Event[]>([]);
  const publish = useConnectionStore((s) => s.publish);
  const { width } = useWindowDimensions();
  const isWide = width >= 800;

  const handlePublish = () => {
    try {
      const event = JSON.parse(text) as Event;
      publish(event);
      setQueue((q) => [...q, event]);
      setError(null);
    } catch {
      setError('Invalid JSON');
    }
  };

  const handleValidate = () => {
    try {
      JSON.parse(text);
      setError(null);
    } catch {
      setError('Invalid JSON');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      className="bg-background">
      <View className="p-4 gap-4 flex-1">
        <View className={isWide ? 'flex-row gap-4 flex-1' : 'gap-4 flex-1'}>
          {/* Input */}
          <View className="flex-1">
            <Text className="text-sm font-semibold text-primary mb-2">
              Event JSON
            </Text>
            <TextInput
              className="border border-border rounded-lg p-3 text-xs text-text font-mono flex-1"
              style={{ minHeight: 400 }}
              multiline
              value={text}
              onChangeText={setText}
            />
          </View>

          {/* Output / Queue */}
          <View className="flex-1">
            <Text className="text-sm font-semibold text-primary mb-2">
              Sent Events ({queue.length})
            </Text>
            <ScrollView className="bg-background-secondary rounded-lg p-3 flex-1" style={{ minHeight: 400 }}>
              {queue.length === 0 ? (
                <Text className="text-xs text-icon">No events sent yet</Text>
              ) : (
                queue.map((evt, i) => (
                  <View
                    key={i}
                    className="mb-2 p-2 bg-white rounded border border-light-grey">
                    <Text className="text-xs text-text">
                      {evt.data?.title ?? evt.type}
                    </Text>
                    <Text className="text-[10px] text-icon">{evt.id}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>

        {error && (
          <Text className="text-sm text-red-500 text-center">{error}</Text>
        )}

        <View className="flex-row justify-center gap-3">
          <Pressable
            onPress={handleValidate}
            className="bg-btn-secondary rounded-lg px-4 py-2">
            <Text className="text-white text-sm font-semibold">Validate</Text>
          </Pressable>
          <Pressable
            onPress={handlePublish}
            className="bg-btn-primary rounded-lg px-4 py-2">
            <Text className="text-white text-sm font-semibold">Publish</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
