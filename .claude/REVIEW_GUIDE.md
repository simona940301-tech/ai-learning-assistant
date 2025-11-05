# Code Review Agent Guide

## Overview

The `/review` slash command provides comprehensive code review capabilities for your Next.js/TypeScript/React monorepo. It systematically checks for type safety, error handling, performance, accessibility, security, and more.

## Usage

### Basic Usage

```bash
/review
```

Reviews all changed files in your git working tree (unstaged + staged changes).

### Review Specific Files

```bash
/review apps/web/components/ask/ChatContainer.tsx
```

```bash
/review apps/web/components/ask/*.tsx
```

### Review After Implementation

Typical workflow:
1. Implement your feature
2. Run `/review` to get comprehensive feedback
3. Address issues based on priority
4. Commit your changes

## What It Checks

### 10 Key Areas

1. **Type Safety** - TypeScript types, no `any`, proper generics
2. **Error Handling** - Try-catch, error boundaries, null checks
3. **Performance** - Memoization, re-renders, optimization
4. **Accessibility** - ARIA, keyboard nav, semantic HTML
5. **Security** - XSS, injection, secrets handling
6. **Code Quality** - DRY, naming, comments
7. **React Best Practices** - Hooks, effects, state management
8. **Next.js Specific** - Server/Client components, routing
9. **Testing** - Coverage, edge cases
10. **Documentation** - JSDoc, comments, README

## Priority Levels

- **P0 (Critical)** - Security vulnerabilities, broken functionality - MUST FIX
- **P1 (High)** - Type errors, missing error handling, performance issues - SHOULD FIX
- **P2 (Medium)** - Code quality, maintainability - NICE TO FIX
- **P3 (Low)** - Style suggestions, minor optimizations - OPTIONAL

## Output Format

You'll receive a structured report:

```markdown
# Code Review Report

## Summary
[Overview of changes and assessment]

## Passed Checks
- Type Safety: PASS
- Error Handling: ISSUES
- Performance: PASS
...

## Issues Found

### P0 - Critical
None

### P1 - High
**Missing error boundary**
- File: `apps/web/components/ask/ChatContainer.tsx:10`
- Problem: API call has no error handling
- Fix: Add try-catch block with error state
- Code: [example]

### P2 - Medium
...

## Score Summary
- Total Issues: 3
  - P0: 0
  - P1: 1
  - P2: 2
  - P3: 0

**Overall Assessment**: CHANGES REQUESTED
```

## Best Practices

### When to Use

- After implementing new features
- Before creating pull requests
- After major refactoring
- When debugging production issues
- Before deployments

### Addressing Feedback

1. **P0 Issues**: Fix immediately before committing
2. **P1 Issues**: Fix before merging to main
3. **P2 Issues**: Fix if time permits, or create follow-up tasks
4. **P3 Issues**: Optional improvements

### Integration with Git Workflow

```bash
# Make changes
git add .

# Review before committing
/review

# Fix critical issues (P0, P1)

# Commit
git commit -m "feat: add new feature"

# Final review
/review

# Push
git push
```

## Examples

### Example 1: Review All Changes

```bash
# After making changes
git status  # See what changed
/review     # Review all changes
```

### Example 2: Review Specific Component

```bash
/review apps/web/components/solve/ExplainCard.tsx
```

### Example 3: Review Entire Feature

```bash
/review apps/web/components/ask/
```

## Tips

1. **Run early, run often**: Catch issues during development, not after
2. **Fix P0 immediately**: Critical issues can cause production failures
3. **Learn from feedback**: The agent explains WHY something is an issue
4. **Use before PR**: Get feedback before your team reviews
5. **Respect the priority**: Don't over-optimize P3 issues

## Project-Specific Considerations

This review agent understands:

- **Monorepo structure**: apps/web, apps/mobile, packages/shared
- **Minimalist philosophy**: Prefers simple, direct solutions
- **TypeScript strict mode**: All strict checks enabled
- **Mobile-first**: Considers mobile UX and performance
- **Next.js App Router**: Server vs Client components

## Common Issues Caught

### Type Safety
- Implicit `any` types
- Missing prop types
- Unsafe type assertions

### Error Handling
- Uncaught promise rejections
- Missing error boundaries
- No fallback UI

### Performance
- Unnecessary re-renders
- Missing memoization
- Inline object creation in JSX

### Accessibility
- Missing ARIA labels
- No keyboard navigation
- Poor semantic HTML

### React Hooks
- Missing dependencies in useEffect
- Incorrect hook usage
- Stale closures

## Integration with Development Tools

### With TypeScript

```bash
npm run type-check  # TypeScript checks
/review            # Comprehensive review including types
```

### With Testing

```bash
npm run test       # Run tests
/review           # Check test coverage and edge cases
```

### With Linting

```bash
npm run lint       # ESLint checks
/review           # Deeper analysis beyond linting
```

## FAQ

**Q: Should I fix all issues?**
A: Fix P0 and P1. P2 and P3 are optional improvements.

**Q: Can I ignore some feedback?**
A: Yes, but understand WHY it's flagged. The agent explains the reasoning.

**Q: Does it replace manual code review?**
A: No, it complements human review by catching common issues automatically.

**Q: How long does a review take?**
A: Typically 30-60 seconds depending on the number of files.

**Q: Can I customize the checklist?**
A: Yes, edit `.claude/commands/review.md` to adjust priorities or add checks.

## Continuous Improvement

The review agent learns from your codebase patterns. It:

- Respects your project's conventions
- Understands your architecture
- Follows your established patterns
- Adapts to your coding style

## Support

If you encounter issues or have suggestions for improving the review agent:

1. Check the command file: `.claude/commands/review.md`
2. Verify git status is working correctly
3. Ensure files are readable and properly formatted
4. Try reviewing specific files first, then expand scope

---

**Remember**: The goal is constructive feedback, not perfection. Use the review agent as a learning tool and safety net, not a blocker.
