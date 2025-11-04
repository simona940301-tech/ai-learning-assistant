# 🏗️ API Architecture Documentation

*Based on Systems Engineer Agent specifications*

---

## 📋 API Endpoints Overview

### Core AI Services

#### `POST /api/ai`
**Purpose**: Main AI processing endpoint for summarization and problem-solving
**Input**:
```json
{
  "type": "summary" | "solve",
  "solveType"?: "vocabulary" | "grammar" | "cloze" | "reading" | "math" | "science",
  "prompt": string,
  "attachments": AttachedFile[],
  "sourceMode": "backpack" | "backpack_academic"
}
```
**Output**: `AskResult` with structured AI response
**Performance**: < 3s response time
**Error Handling**: Graceful degradation with user-friendly messages

#### `POST /api/backpack/save`
**Purpose**: Save AI results to user's backpack
**Input**:
```json
{
  "subject": string,
  "title": string,
  "tags": string[],
  "content": string,
  "mode": "save" | "overwrite",
  "originalId"?: string
}
```
**Output**: Saved item with metadata
**Error Handling**: Fallback to mock response for development

### Data Management

#### `POST /api/init-db`
**Purpose**: Initialize database schema (development only)
**Input**: None
**Output**: Schema creation status
**Security**: Development environment only

---

## 🔄 Event Tracking System

### Analytics Events
- `ai_interaction`: AI request tracking
- `learning_action`: User learning activities
- `user_flow`: Navigation tracking
- `error`: Error monitoring
- `performance`: Response time tracking

### Event Schema
```typescript
interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  timestamp: string
  userId?: string
  sessionId: string
}
```

---

## 🏛️ Database Schema

### Core Tables
- `profiles`: User profiles with XP/coins/streaks
- `backpack_items`: User's saved content with versioning
- `ai_interactions`: AI request history
- `learning_metrics`: Learning progress tracking

### Key Relationships
- `backpack_items.user_id` → `profiles.id`
- `ai_interactions.user_id` → `profiles.id`
- `learning_metrics.user_id` → `profiles.id`

---

## 🚀 Performance Optimization

### Response Time Targets
- AI Processing: < 3 seconds
- Database Operations: < 500ms
- File Upload: < 2 seconds
- Page Load: < 1 second

### Caching Strategy
- Static assets: Browser cache
- API responses: Redis cache (future)
- Database queries: Connection pooling

### Error Handling
- Graceful degradation
- User-friendly error messages
- Automatic retry for transient failures
- Comprehensive logging

---

## 🔒 Security Measures

### Authentication
- Supabase Auth integration
- Row Level Security (RLS)
- Service Role for admin operations

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF tokens

### Privacy
- User data encryption
- GDPR compliance ready
- Data retention policies
- Audit logging

---

## 📊 Monitoring & Analytics

### Health Checks
- API endpoint availability
- Database connectivity
- External service status
- Response time monitoring

### Business Metrics
- User engagement rates
- Learning completion rates
- AI interaction success rates
- Error rates and patterns

### Technical Metrics
- API response times
- Database query performance
- Memory usage
- CPU utilization

---

## 🔧 Development Guidelines

### Code Standards
- TypeScript for type safety
- Consistent error handling
- Comprehensive logging
- Unit test coverage

### API Design Principles
- RESTful conventions
- Consistent response formats
- Clear error codes
- Comprehensive documentation

### Deployment
- Environment-specific configurations
- Automated testing
- Zero-downtime deployments
- Rollback capabilities

---

*This architecture ensures scalability, reliability, and maintainability while delivering exceptional user experiences.*
