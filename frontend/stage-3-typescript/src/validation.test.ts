import { describe, expect, it } from 'vitest';
import { parseCreateTaskInput, parseJson, unwrap } from './validation.js';

describe('parseCreateTaskInput', () => {
  it('parses a minimal valid input and applies the priority default', () => {
    const result = parseCreateTaskInput({ title: 'Write the lesson' });

    expect(result.ok).toBe(true);
    // Narrowing: `result.value` is only reachable once `ok` is true.
    if (result.ok) {
      expect(result.value).toEqual({ title: 'Write the lesson', priority: 'medium' });
    }
  });

  it('trims whitespace', () => {
    const result = parseCreateTaskInput({ title: '   Ship it   ' });
    expect(result.ok && result.value.title).toBe('Ship it');
  });

  it('rejects a non-object', () => {
    expect(parseCreateTaskInput('nope')).toEqual({
      ok: false,
      error: [{ path: '', message: 'expected an object' }],
    });
  });

  it('collects EVERY error, not just the first', () => {
    // A form that reports one problem per submit is a bad form.
    const result = parseCreateTaskInput({ title: 'x', priority: 'urgent', dueDate: 'tomorrow' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.map((e) => e.path).sort()).toEqual(['dueDate', 'priority', 'title']);
    }
  });

  it('rejects a date that matches the regex but is not a real day', () => {
    const result = parseCreateTaskInput({ title: 'Valid title', dueDate: '2026-02-31' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error[0]).toEqual({ path: 'dueDate', message: 'is not a real calendar date' });
    }
  });

  it('treats an absent optional field differently from an invalid one', () => {
    expect(parseCreateTaskInput({ title: 'Valid title', description: null }).ok).toBe(true);
    expect(parseCreateTaskInput({ title: 'Valid title', description: 42 }).ok).toBe(false);
  });
});

describe('parseJson', () => {
  it('returns unknown, not any, so the caller must keep parsing', () => {
    const parsed = parseJson('{"title":"Ship it"}');
    expect(parsed.ok).toBe(true);

    // `parsed.value` is `unknown` here - feeding it straight through the domain
    // parser is the only way to get a typed value out.
    if (parsed.ok) {
      expect(parseCreateTaskInput(parsed.value).ok).toBe(true);
    }
  });

  it('reports malformed JSON as a value rather than throwing', () => {
    expect(parseJson('{oops').ok).toBe(false);
  });
});

describe('unwrap', () => {
  it('returns the value on success', () => {
    expect(unwrap(parseCreateTaskInput({ title: 'Ship it' }))).toEqual({
      title: 'Ship it',
      priority: 'medium',
    });
  });

  it('throws a message listing every field that failed', () => {
    expect(() => unwrap(parseCreateTaskInput({ title: 'x', priority: 'nope' }))).toThrow(
      /title: must be at least 3 characters; priority: must be one of/,
    );
  });
});
