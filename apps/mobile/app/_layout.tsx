import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'PLMS' }} />
      <Stack.Screen name="ready-score" options={{ title: 'Ready Score' }} />
      <Stack.Screen name="error-book" options={{ title: 'Error Book' }} />
      <Stack.Screen name="question" options={{ title: 'Question' }} />
    </Stack>
  );
}
