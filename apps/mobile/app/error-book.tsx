import { View, Text, StyleSheet } from 'react-native';
import { createPLMSClient } from '@plms/shared/sdk';

export default function ErrorBookScreen() {
  const plms = createPLMSClient({
    baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
    platform: 'mobile',
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Error Book</Text>
      <Text style={styles.description}>
        Track and review your mistakes to improve faster
      </Text>

      <View style={styles.placeholder}>
        <Text>Error Book feature coming soon...</Text>
        <Text style={styles.note}>
          Will use plms.errorBook.getErrors() to fetch errors
        </Text>
      </View>
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
  placeholder: {
    padding: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  note: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});
