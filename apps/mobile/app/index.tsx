import { View, Text, Button, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { createPLMSClient } from '@plms/shared/sdk';
import { createFeatureFlags } from '@plms/shared/config';

export default function HomeScreen() {
  // Example: Initialize PLMS SDK
  const plms = createPLMSClient({
    baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
    platform: 'mobile',
  });

  // Example: Check feature flags
  const flags = createFeatureFlags('mobile');
  const readyScoreEnabled = flags.isEnabled('ready_score_v2');
  const cameraEnabled = flags.isEnabled('question_camera');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PLMS Mobile App</Text>
      <Text style={styles.subtitle}>AI Learning Assistant</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features:</Text>
        <Text>Ready Score: {readyScoreEnabled ? '✅' : '❌'}</Text>
        <Text>Camera: {cameraEnabled ? '✅' : '❌'}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Link href="/ready-score" asChild>
          <Button title="Ready Score Test" />
        </Link>
      </View>

      <View style={styles.buttonContainer}>
        <Link href="/error-book" asChild>
          <Button title="Error Book" />
        </Link>
      </View>

      <View style={styles.buttonContainer}>
        <Link href="/question" asChild>
          <Button title="Capture Question" />
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  buttonContainer: {
    marginVertical: 8,
  },
});
