# PLMS SDK Documentation

## 📚 Overview

The PLMS SDK (`@plms/shared`) is a unified TypeScript SDK that provides:
- **Type-safe API client** with automatic error handling
- **Zod schemas** for all data models
- **Feature flags** for platform-specific capabilities
- **Analytics tracking** interface
- **Common utilities** for validation, date formatting, etc.

All business logic is centralized in the SDK. Web, mobile, and desktop apps consume the SDK without implementing any API logic themselves.

---

## 🚀 Quick Start

### Installation

The SDK is automatically available in all workspace packages:

```typescript
// Import from SDK
import { createPLMSClient } from '@plms/shared/sdk';
import type { User, QuestionRecord } from '@plms/shared/types';
import { createFeatureFlags } from '@plms/shared/config';
import { createAnalytics } from '@plms/shared/analytics';
```

### Basic Usage

```typescript
// 1. Create SDK client
const plms = createPLMSClient({
  baseUrl: 'https://api.plms.com',
  platform: 'mobile', // or 'web' | 'desktop'
});

// 2. Set authentication token provider
plms.setTokenProvider(async () => {
  return await getStoredToken();
});

// 3. Use SDK methods
const result = await plms.readyScore.submitTest({
  userId: 'user-123',
  subject: 'math',
  level: 'junior_high_1',
  answers: [...],
  startedAt: '2025-10-25T10:00:00Z',
  completedAt: '2025-10-25T10:15:00Z',
});

console.log(`Score: ${result.score}, Level: ${result.readyLevel}`);
```

---

## 📦 SDK Modules

### 1. Authentication (`plms.auth`)

```typescript
// Login
const { user, tokens } = await plms.auth.login({
  email: 'student@example.com',
  password: 'password123',
  platform: 'mobile',
});

// Register
const { user, tokens } = await plms.auth.register({
  email: 'student@example.com',
  password: 'password123',
  name: 'John Doe',
  role: 'student',
});

// Refresh token
const newTokens = await plms.auth.refreshToken({
  refreshToken: tokens.refreshToken,
});

// Get current user
const currentUser = await plms.auth.getCurrentUser();

// Logout
await plms.auth.logout();
```

### 2. Ready Score (`plms.readyScore`)

```typescript
// Generate test
const questions = await plms.readyScore.generateTest({
  subject: 'math',
  level: 'junior_high_1',
  questionCount: 10,
});

// Submit test
const result = await plms.readyScore.submitTest({
  userId: 'user-123',
  subject: 'math',
  level: 'junior_high_1',
  answers: [
    { questionId: 'q1', userAnswer: 'A', timeSpentSeconds: 30 },
    { questionId: 'q2', userAnswer: 'B', timeSpentSeconds: 45 },
  ],
  startedAt: '2025-10-25T10:00:00Z',
  completedAt: '2025-10-25T10:15:00Z',
});

// Calculate level (client-side helper)
const level = plms.readyScore.calculateLevel(result.score);
// Returns: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master'

// Get history
const history = await plms.readyScore.getHistory({
  userId: 'user-123',
  subject: 'math',
  limit: 10,
});

// Get statistics
const stats = await plms.readyScore.getStats('user-123');
```

### 3. Error Book (`plms.errorBook`)

```typescript
// Add error
const errorEntry = await plms.errorBook.addError({
  userId: 'user-123',
  questionId: 'q-456',
  subject: 'math',
  category: 'calculation',
  userAnswer: '42',
  correctAnswer: '43',
  difficulty: 'medium',
  analysis: 'Arithmetic mistake in final step',
  notes: 'Need to practice more carefully',
  tags: ['algebra', 'equations'],
});

// Get errors
const errors = await plms.errorBook.getErrors({
  userId: 'user-123',
  subject: 'math',
  isMastered: false,
  limit: 20,
});

// Mark as mastered
const mastered = await plms.errorBook.markAsMastered(errorEntry.id);

// Start review session
const session = await plms.errorBook.startReviewSession({
  userId: 'user-123',
  errorBookIds: ['error-1', 'error-2', 'error-3'],
});

// Complete review session
await plms.errorBook.completeReviewSession(session.id, {
  questionsReviewed: 3,
  questionsCorrect: 2,
  averageTimePerQuestion: 45,
});

// Get statistics
const stats = await plms.errorBook.getStats('user-123');

// Classify error (client-side helper)
const category = plms.errorBook.classifyError(
  'wrong answer',
  'correct answer',
  'Student made a calculation error'
);
// Returns: ErrorCategory
```

### 4. Questions (`plms.question`)

```typescript
// Submit question
const question = await plms.question.submitQuestion({
  userId: 'user-123',
  subject: 'math',
  questionType: 'multiple_choice',
  content: 'What is 2 + 2?',
  source: {
    type: 'camera',
    imageUrl: 'https://...image.jpg',
  },
  options: ['3', '4', '5', '6'],
  tags: ['arithmetic', 'addition'],
});

// Upload image (OCR)
const extracted = await plms.question.uploadImage({
  userId: 'user-123',
  imageData: 'base64-encoded-image',
  subject: 'math',
});

// Get solution
const solution = await plms.question.getSolution(question.id);

// Generate solution
const generated = await plms.question.generateSolution(question.id);

// Record attempt
const attempt = await plms.question.recordAttempt({
  questionId: question.id,
  userId: 'user-123',
  userAnswer: '4',
  isCorrect: true,
  timeSpentSeconds: 30,
  hintsUsed: 0,
});

// Get history
const history = await plms.question.getHistory({
  userId: 'user-123',
  subject: 'math',
  limit: 20,
});

// Search questions
const results = await plms.question.searchQuestions({
  query: 'quadratic equation',
  subject: 'math',
  tags: ['algebra'],
  limit: 10,
});
```

---

## 🎯 Feature Flags

```typescript
import { createFeatureFlags } from '@plms/shared/config';

// Create flag manager
const flags = createFeatureFlags('mobile');

// Set user ID for personalized rollout
flags.setUserId('user-123');

// Check if feature is enabled
if (flags.isEnabled('ready_score_v2')) {
  // Show Ready Score v2
}

if (flags.isEnabled('question_camera')) {
  // Show camera button
}

// Get all enabled flags
const enabled = flags.getEnabledFlags();
// Returns: ['auth_enabled', 'ready_score_v2', 'error_book', ...]

// Update flag at runtime
flags.updateFlag('ai_tutor', { enabled: true });
```

### Available Feature Flags

| Flag | Platforms | Default | Description |
|------|-----------|---------|-------------|
| `auth_enabled` | all | ✅ | Authentication system |
| `ready_score_v2` | web, mobile | ✅ | Ready Score test v2 |
| `error_book` | all | ✅ | Error book feature |
| `question_camera` | mobile | ✅ | Camera question capture |
| `ai_tutor` | all | ❌ | AI tutor feature (10% rollout) |
| `parent_dashboard` | web | ❌ | Parent dashboard |
| `weekly_report` | all | ❌ | Weekly progress reports |
| `task_tracking` | all | ❌ | Task tracking module |
| `gamification` | all | ✅ | Gamification features |
| `offline_mode` | mobile | ❌ | Offline mode |
| `voice_input` | all | ❌ | Voice input for questions |
| `ar_learning` | mobile | ❌ | AR learning experiences |
| `peer_collaboration` | all | ❌ | Peer collaboration |

---

## 📊 Analytics

```typescript
import { createAnalytics, ConsoleAnalyticsTracker } from '@plms/shared/analytics';

// Create analytics manager
const analytics = createAnalytics();

// Add tracker (implement platform-specific tracker)
analytics.addTracker(new ConsoleAnalyticsTracker());

// Set user ID
analytics.setUserId('user-123');

// Track event
analytics.track('question_captured', {
  subject: 'math',
  questionType: 'multiple_choice',
  source: 'camera',
});

analytics.track('ready_score_completed', {
  score: 85,
  level: 'advanced',
  subject: 'math',
  questionsCount: 10,
});

// Track screen view
analytics.screen('ReadyScoreScreen', {
  subject: 'math',
});

// Set user properties
analytics.setUserProperties({
  grade: 'junior_high_1',
  preferredSubject: 'math',
});

// Reset (on logout)
analytics.reset();
```

### Implement Custom Tracker

```typescript
import type { AnalyticsTracker } from '@plms/shared/analytics';

class GoogleAnalyticsTracker implements AnalyticsTracker {
  track(eventName, properties) {
    // Send to Google Analytics
    gtag('event', eventName, properties);
  }

  identify(userId, traits) {
    gtag('set', { user_id: userId });
  }

  screen(screenName, properties) {
    gtag('event', 'screen_view', {
      screen_name: screenName,
      ...properties,
    });
  }

  setUserProperties(properties) {
    gtag('set', 'user_properties', properties);
  }

  reset() {
    // Clear GA user data
  }
}

// Use custom tracker
analytics.addTracker(new GoogleAnalyticsTracker());
```

---

## 🛠️ Utilities

### Date Utilities

```typescript
import { now, diffInSeconds, formatDuration, isToday } from '@plms/shared/utils';

const timestamp = now(); // '2025-10-25T10:00:00.000Z'

const diff = diffInSeconds('2025-10-25T10:00:00Z', '2025-10-25T10:05:30Z'); // 330

const formatted = formatDuration(330); // '5m 30s'

const today = isToday('2025-10-25T10:00:00Z'); // true
```

### Validation Utilities

```typescript
import { isValidEmail, validatePassword, isValidUUID } from '@plms/shared/utils';

const validEmail = isValidEmail('test@example.com'); // true

const passwordCheck = validatePassword('weak');
// { valid: false, errors: ['Password must be at least 8 characters', ...] }

const validUUID = isValidUUID('123e4567-e89b-12d3-a456-426614174000'); // true
```

### String Utilities

```typescript
import { truncate, capitalize, slugify } from '@plms/shared/utils';

const short = truncate('This is a long text', 10); // 'This is...'

const title = capitalize('hello world'); // 'Hello world'

const slug = slugify('Hello World! 123'); // 'hello-world-123'
```

---

## 🔒 Type Safety

All SDK methods are fully typed using Zod schemas:

```typescript
import type {
  User,
  QuestionRecord,
  ReadyScoreResult,
  ErrorBookEntry,
  Subject,
  LearningLevel,
} from '@plms/shared/types';

// Runtime validation
import { UserSchema, QuestionRecordSchema } from '@plms/shared/types';

const result = UserSchema.safeParse(data);
if (result.success) {
  const user: User = result.data;
}
```

---

## 🚨 Error Handling

```typescript
import { ApiError } from '@plms/shared/sdk';

try {
  const result = await plms.readyScore.submitTest(data);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.code, error.message);
    console.error('Status:', error.statusCode);
    console.error('Details:', error.details);
  }
}

// Global error handler
const plms = createPLMSClient({
  baseUrl: 'https://api.plms.com',
  platform: 'mobile',
  onError: (error) => {
    // Log to error tracking service
    console.error('SDK Error:', error);
  },
});
```

---

## 🔄 Extending the SDK

### Adding a New Feature Module

1. **Define types** in `packages/shared/types/your-feature.ts`:

```typescript
import { z } from 'zod';

export const YourFeatureSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  // ...
});

export type YourFeature = z.infer<typeof YourFeatureSchema>;
```

2. **Create SDK module** in `packages/shared/sdk/your-feature.ts`:

```typescript
import type { BaseClient } from './base-client';
import type { YourFeature } from '../types';

export class YourFeatureSDK {
  constructor(private client: BaseClient) {}

  async getFeature(id: string): Promise<YourFeature> {
    return this.client.get(`/api/your-feature/${id}`);
  }

  async createFeature(data: Partial<YourFeature>): Promise<YourFeature> {
    return this.client.post('/api/your-feature', data);
  }
}
```

3. **Add to PLMSClient** in `packages/shared/sdk/index.ts`:

```typescript
import { YourFeatureSDK } from './your-feature';

export class PLMSClient {
  public readonly yourFeature: YourFeatureSDK;

  constructor(config: SDKConfig) {
    // ...
    this.yourFeature = new YourFeatureSDK(this.baseClient);
  }
}
```

4. **Export types** in `packages/shared/types/index.ts`:

```typescript
export * from './your-feature';
```

5. **Use in apps**:

```typescript
const result = await plms.yourFeature.getFeature('id');
```

---

## 📱 Platform-Specific Examples

### Web (Next.js)

```typescript
// app/providers.tsx
'use client';

import { createPLMSClient } from '@plms/shared/sdk';
import { createAnalytics } from '@plms/shared/analytics';
import { useEffect } from 'react';

const plms = createPLMSClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  platform: 'web',
});

plms.setTokenProvider(async () => {
  return localStorage.getItem('auth_token');
});

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const analytics = createAnalytics();
    // Add trackers...
  }, []);

  return <>{children}</>;
}
```

### Mobile (Expo)

```typescript
// app/index.tsx
import { createPLMSClient } from '@plms/shared/sdk';
import * as SecureStore from 'expo-secure-store';

const plms = createPLMSClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL!,
  platform: 'mobile',
});

plms.setTokenProvider(async () => {
  return await SecureStore.getItemAsync('auth_token');
});

export default function App() {
  // Use plms SDK...
}
```

---

## ✅ Best Practices

1. **Never bypass the SDK** - Always use SDK methods, never call `fetch` directly
2. **Use type imports** - Import types separately: `import type { User } from '@plms/shared/types'`
3. **Handle errors** - Always wrap SDK calls in try-catch
4. **Validate at boundaries** - Use Zod schemas to validate external data
5. **Platform-specific logic in apps** - Keep platform UI code in apps, logic in SDK
6. **Feature flags first** - Check flags before showing new features
7. **Track everything** - Use analytics to understand user behavior

---

## 📖 API Response Format

All SDK methods return unwrapped data. The SDK handles the ApiResponse wrapper internally:

```typescript
// Server returns:
{
  "success": true,
  "data": { "id": "123", "name": "Test" },
  "timestamp": "2025-10-25T10:00:00Z"
}

// SDK returns just the data:
const result = await plms.yourFeature.get('123');
// result = { "id": "123", "name": "Test" }
```

Errors are thrown as `ApiError`:

```typescript
// Server returns:
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  },
  "timestamp": "2025-10-25T10:00:00Z"
}

// SDK throws:
throw new ApiError('NOT_FOUND', 'Resource not found', 404);
```

---

## 🤝 Support

- **Documentation**: See this file
- **Issues**: Report in GitHub Issues
- **Examples**: Check `apps/mobile/app/` and `apps/web/app/` for usage examples

---

**Built with ❤️ for the PLMS team**
