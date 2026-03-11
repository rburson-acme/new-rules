import { Stack } from 'expo-router';

export default function ThredsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[thredId]" />
    </Stack>
  );
}
