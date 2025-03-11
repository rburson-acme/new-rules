import { ModalProvider } from '@/src/contexts/ModalContext';
import { Stack } from 'expo-router';
import { PatternModel } from 'thredlib';

export default function PatternManagerLayout() {
  return (
    <ModalProvider<PatternModel>>
      <Stack>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen name="patternId" />
      </Stack>
    </ModalProvider>
  );
}
