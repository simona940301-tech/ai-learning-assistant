# Code Review Example Output

This document shows what a typical `/review` command output looks like.

## Example Command

```bash
/review apps/web/components/ask/ChatContainer.tsx
```

## Sample Output

```markdown
# Code Review Report

## Summary

Reviewed `ChatContainer.tsx` - a simple chat container component with auto-scroll functionality. The component is well-structured with clean TypeScript types and follows React best practices. Found 2 minor issues related to performance optimization and accessibility.

## Passed Checks

- Type Safety: ✅ PASS
- Error Handling: ✅ PASS
- Performance: ⚠️ ISSUES (minor)
- Accessibility: ⚠️ ISSUES (minor)
- Security: ✅ PASS
- Code Quality: ✅ PASS
- React Best Practices: ✅ PASS
- Next.js Specific: ✅ PASS
- Testing: ⚪ N/A (no tests in scope)
- Documentation: ✅ PASS

## Issues Found

### P0 - Critical (Security, Broken Functionality)

None

### P1 - High (Type Errors, Missing Error Handling, Performance)

None

### P2 - Medium (Code Quality, Maintainability)

**Consider memoizing ChatContainer**

- File: `apps/web/components/ask/ChatContainer.tsx:7`
- Problem: Component will re-render whenever parent re-renders, even if children haven't changed. For a chat container that scrolls frequently, this could cause performance issues with large message lists.
- Fix: Wrap component with `React.memo` to prevent unnecessary re-renders
- Code:

```typescript
// Current
const ChatContainer = ({ children }: ChatContainerProps) => {
  // ...
}

// Suggested
import { ReactNode, useEffect, useRef, memo } from 'react'

const ChatContainer = memo(({ children }: ChatContainerProps) => {
  // ...
})

ChatContainer.displayName = 'ChatContainer'
```

### P3 - Low (Style, Minor Optimizations)

**Add ARIA role and label for chat container**

- File: `apps/web/components/ask/ChatContainer.tsx:16`
- Problem: Screen readers may not properly identify this as a chat/message container. Adding semantic ARIA attributes would improve accessibility for users with disabilities.
- Fix: Add `role="log"` and `aria-label` to the container div
- Code:

```typescript
// Current
<div className="flex-1 overflow-y-auto px-4 pb-36 pt-20 sm:px-0">

// Suggested
<div
  className="flex-1 overflow-y-auto px-4 pb-36 pt-20 sm:px-0"
  role="log"
  aria-label="Chat messages"
  aria-live="polite"
>
```

**Consider using useLayoutEffect for scroll positioning**

- File: `apps/web/components/ask/ChatContainer.tsx:10`
- Problem: `useEffect` runs after paint, which might cause visible scroll jumping. `useLayoutEffect` runs before paint, providing smoother scroll behavior.
- Fix: Change to `useLayoutEffect` for DOM mutations that affect layout
- Code:

```typescript
// Current
import { ReactNode, useEffect, useRef } from 'react'

useEffect(() => {
  anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
}, [children])

// Suggested
import { ReactNode, useLayoutEffect, useRef } from 'react'

useLayoutEffect(() => {
  anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
}, [children])
```

## Recommendations

1. **Consider debouncing scroll updates**: If the chat receives rapid message updates, the frequent scrolling might cause performance issues. Consider debouncing the scroll operation.

2. **Add scroll position restoration**: If users scroll up to read history, automatically scrolling to bottom on every new message could be disruptive. Consider detecting if user has scrolled up and only auto-scroll if they're already at the bottom.

3. **Test with large message lists**: Verify performance with 100+ messages to ensure smooth scrolling.

4. **Consider virtualization**: For very long chat histories, consider using a virtualization library like `react-window` to only render visible messages.

## Score Summary

- Total Issues: 4
  - P0 (Critical): 0
  - P1 (High): 0
  - P2 (Medium): 1
  - P3 (Low): 3

**Overall Assessment**: ✅ APPROVED WITH COMMENTS

The component is production-ready. The P2 issue is a minor optimization that could improve performance with large message lists. The P3 issues are optional improvements for accessibility and UX refinement.

---

## What Makes This Review Constructive?

1. **Specific locations**: Every issue includes file path and line number
2. **Explains WHY**: Each issue explains the problem, not just what to change
3. **Shows HOW**: Provides both current and suggested code
4. **Prioritized**: Clear priority levels help you decide what to fix
5. **Contextual**: Considers the project's goals and patterns
6. **Actionable**: Every suggestion is implementable immediately
7. **Balanced**: Acknowledges what's done well, not just problems

## How to Address This Review

### Immediate Actions (P0, P1)
None - no critical or high-priority issues

### Before Merge (P2)
- Add `React.memo` to prevent unnecessary re-renders

### Optional Improvements (P3)
- Add ARIA attributes for accessibility
- Switch to `useLayoutEffect` for smoother scrolling
- Consider scroll position detection for better UX

### Follow-up Tasks
- Performance testing with large message lists
- Consider virtualization for future optimization
```

## Key Features Demonstrated

### 1. Structured Format
Clear sections make it easy to scan and prioritize issues.

### 2. Priority-Based Organization
Issues grouped by severity, not by file or type.

### 3. Actionable Feedback
Each issue includes:
- Location (file:line)
- Problem explanation
- Specific fix
- Code examples

### 4. Balanced Perspective
- Acknowledges what's done well
- Explains tradeoffs
- Considers project context

### 5. Clear Next Steps
The "Overall Assessment" tells you exactly what action to take:
- APPROVED → Ship it
- APPROVED WITH COMMENTS → Ship, but consider improvements
- CHANGES REQUESTED → Fix P1 issues first
- BLOCKED → Must fix P0 issues

## Real-World Usage Tips

### After Getting This Review

1. **Read the Summary first** - Get the big picture
2. **Check the Score Summary** - Understand overall code health
3. **Fix P0 and P1** - These are must-fix issues
4. **Evaluate P2** - Fix if time permits or create tickets
5. **Consider P3** - Optional but valuable improvements
6. **Learn from feedback** - The agent teaches best practices

### Making the Most of Reviews

- **Don't take it personally** - It's constructive feedback, not criticism
- **Ask "why" if unclear** - The agent explains reasoning
- **Learn the patterns** - Common issues will reduce over time
- **Share with team** - Use reviews as teaching moments
- **Iterate** - Run `/review` again after fixes

---

This example demonstrates the review agent's ability to provide thorough, constructive, and actionable feedback that helps you write better code while learning best practices.
