import { View, Text, Button, StyleSheet } from 'react-native';
import { createPLMSClient } from '@plms/shared/sdk';
import { createFeatureFlags } from '@plms/shared/config';

export default function QuestionScreen() {
  const plms = createPLMSClient({
    baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
    platform: 'mobile',
  });

  const flags = createFeatureFlags('mobile');
  const cameraEnabled = flags.isEnabled('question_camera');

  const captureQuestion = () => {
    // TODO: Implement camera capture
    alert('Camera feature coming soon!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Capture Question</Text>
      <Text style={styles.description}>
        Take a photo of your question to get instant help
      </Text>

      {cameraEnabled ? (
        <View style={styles.section}>
          <Button title="📷 Open Camera" onPress={captureQuestion} />
          <Text style={styles.note}>
            Will use expo-camera to capture question image
          </Text>
        </View>
      ) : (
        <View style={styles.disabled}>
          <Text>Camera feature is disabled in feature flags</Text>
        </View>
      )}

      <View style={styles.apiInfo}>
        <Text style={styles.apiTitle}>SDK Methods Available:</Text>
        <Text>• plms.question.submitQuestion()</Text>
        <Text>• plms.question.uploadImage()</Text>
        <Text>• plms.question.getSolution()</Text>
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
  section: {
    marginBottom: 24,
  },
  note: {
    marginTop: 12,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  disabled: {
    padding: 16,
    backgroundColor: '#fef3cd',
    borderRadius: 8,
    marginBottom: 24,
  },
  apiInfo: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  apiTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
});
