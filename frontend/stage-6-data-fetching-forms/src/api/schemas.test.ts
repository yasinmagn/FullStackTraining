import { describe, expect, it } from 'vitest';
import { createTaskSchema, taskListSchema, taskSchema, toFieldErrors } from './schemas.ts';

describe('taskSchema', () => {
  const valid = {
    id: '1',
    title: 'Ship it',
    description: null,
    priority: 'high',
    status: 'todo',
    dueDate: '2026-02-01',
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-01-01T09:00:00.000Z',
  };

  it('accepts a well-formed task', () => {
    expect(taskSchema.parse(valid)).toEqual(valid);
  });

  it('rejects an unknown priority', () => {
    // This is the check that catches a backend that started sending 'urgent'.
    expect(taskSchema.safeParse({ ...valid, priority: 'urgent' }).success).toBe(false);
  });

  it('rejects a missing field rather than yielding undefined deep in a component', () => {
    const { title, ...withoutTitle } = valid;
    expect(taskSchema.safeParse(withoutTitle).success).toBe(false);
  });

  it('validates the list envelope, not just the items', () => {
    expect(
      taskListSchema.safeParse({ data: [valid], meta: { total: 1, page: 1, pageSize: 10 } }).success,
    ).toBe(true);

    // page must be positive - a 0 here would break every pager calculation.
    expect(
      taskListSchema.safeParse({ data: [valid], meta: { total: 1, page: 0, pageSize: 10 } }).success,
    ).toBe(false);
  });
});

describe('createTaskSchema', () => {
  const base = { title: 'Write the lesson', description: '', priority: 'medium', dueDate: '' };

  it('trims and turns empty optional strings into null', () => {
    const parsed = createTaskSchema.parse({ ...base, title: '  Write the lesson  ' });

    expect(parsed.title).toBe('Write the lesson');
    // '' from an untouched input means "absent", not "empty string".
    expect(parsed.description).toBeNull();
    expect(parsed.dueDate).toBeNull();
  });

  it('reports a friendly message for a short title', () => {
    const result = createTaskSchema.safeParse({ ...base, title: 'ab' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error)).toEqual({ title: 'Title needs at least 3 characters' });
    }
  });

  it('rejects a malformed due date', () => {
    const result = createTaskSchema.safeParse({ ...base, dueDate: 'next tuesday' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).dueDate).toBe('Due date must be YYYY-MM-DD');
    }
  });

  it('keeps only the first message per field', () => {
    const result = createTaskSchema.safeParse({ title: 'ab', description: 1, priority: 'nope', dueDate: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = toFieldErrors(result.error);
      // One message per field - four complaints about one input is noise.
      expect(Object.values(errors).every((message) => typeof message === 'string')).toBe(true);
      expect(errors.title).toBe('Title needs at least 3 characters');
    }
  });
});
