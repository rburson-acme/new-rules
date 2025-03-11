import { ModalProvider } from '@/src/contexts/ModalContext';
import { AdminEvent } from '@/src/core/AdminEvent';
import { Stack } from 'expo-router';

export default function ThredManagerLayout() {
  return (
    <ModalProvider<AdminEvent>>
      <Stack>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen name="thredId" />
      </Stack>
    </ModalProvider>
  );
}
