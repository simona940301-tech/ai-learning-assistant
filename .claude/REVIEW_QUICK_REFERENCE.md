# /review Quick Reference

## Basic Commands

```bash
/review                                          # Review all git changes
/review path/to/file.tsx                        # Review specific file
/review apps/web/components/ask/*.tsx           # Review multiple files
```

## Priority System

| Priority | Severity | Action Required | Examples |
|----------|----------|-----------------|----------|
| P0 | Critical | Fix immediately | Security vulnerabilities, crashes, data loss |
| P1 | High | Fix before merge | Type errors, missing error handling, major bugs |
| P2 | Medium | Fix if possible | Code quality, maintainability, minor bugs |
| P3 | Low | Optional | Style improvements, micro-optimizations |

## 10 Areas Checked

1. Type Safety
2. Error Handling
3. Performance
4. Accessibility
5. Security
6. Code Quality
7. React Best Practices
8. Next.js Specific
9. Testing
10. Documentation

## Assessment Outcomes

- **APPROVED** → Ship it (0 issues or P3 only)
- **APPROVED WITH COMMENTS** → Ship with improvements (P2-P3 only)
- **CHANGES REQUESTED** → Fix first (P1 present)
- **BLOCKED** → Must fix (P0 present)

## Typical Workflow

```bash
# 1. Implement feature
# ... code changes ...

# 2. Review
/review

# 3. Fix P0 and P1 issues
# ... fixes ...

# 4. Verify
/review

# 5. Commit
git commit -m "feat: add feature"
```

## Common Issues Caught

### Type Safety
- Missing types, implicit `any`, unsafe assertions

### Error Handling
- Uncaught promises, missing error boundaries, no fallbacks

### Performance
- Unnecessary re-renders, missing memoization, inline objects

### Accessibility
- Missing ARIA labels, no keyboard nav, poor semantics

### React Hooks
- Wrong dependencies, stale closures, incorrect usage

## Files Created

- `.claude/commands/review.md` - Review agent configuration
- `.claude/REVIEW_GUIDE.md` - Comprehensive usage guide
- `.claude/REVIEW_EXAMPLE.md` - Example review output
- `.claude/REVIEW_QUICK_REFERENCE.md` - This quick reference

## Learn More

- Read `REVIEW_GUIDE.md` for detailed usage
- Check `REVIEW_EXAMPLE.md` for sample output
- Edit `commands/review.md` to customize

---

**Tip**: Run `/review` early and often. Catch issues during development, not in production.
