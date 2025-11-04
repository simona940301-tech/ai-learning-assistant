import { useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { createPLMSClient } from '@plms/shared/sdk';
import type { ReadyScoreQuestion, Subject, LearningLevel } from '@plms/shared/types';

export default function ReadyScoreScreen() {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<ReadyScoreQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const plms = createPLMSClient({
    baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
    platform: 'mobile',
  });

  const generateTest = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await plms.readyScore.generateTest({
        subject: 'math' as Subject,
        level: 'junior_high_1' as LearningLevel,
        questionCount: 10,
      });

      setQuestions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ready Score Test</Text>
      <Text style={styles.description}>
        Take a quick test to assess your current level
      </Text>

      {error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Button title="Start Math Test" onPress={generateTest} disabled={loading} />

      {loading && <ActivityIndicator size="large" style={styles.loader} />}

      {questions.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>
            Generated {questions.length} questions
          </Text>
          <Text>Subject: {questions[0].subject}</Text>
          <Text>Level: {questions[0].level}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  error: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c00',
  },
  loader: {
    marginTop: 24,
  },
  results: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});
