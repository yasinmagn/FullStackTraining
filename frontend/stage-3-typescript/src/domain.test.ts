import { describe, expect, it } from 'vitest';
import {
  PRIORITY_LABELS,
  assertNever,
  describeRemoteData,
  indexBy,
  isPresent,
  isTaskStatus,
  taskId,
  toTask,
  type RemoteData,
  type TaskRow,
} from './domain.js';

describe('branded ids', () => {
  it('accepts a uuid-shaped string', () => {
    expect(taskId('3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toBe('3f2504e0-4f89-11d3-9a0c-0305e82c3301');
  });

  it('rejects anything else at the only place ids are created', () => {
    expect(() => taskId('42')).toThrow(TypeError);
  });
});

describe('discriminated unions', () => {
  it('narrows each variant', () => {
    const cases: RemoteData<number>[] = [
      { state: 'idle' },
      { state: 'loading' },
      { state: 'success', data: 42 },
      { state: 'failure', error: new Error('nope') },
    ];

    expect(cases.map(describeRemoteData)).toEqual([
      'Not started',
      'Loading...',
      'Loaded 42',
      'Failed: nope',
    ]);
  });

  it('assertNever throws if an impossible value ever arrives at runtime', () => {
    // The compiler stops this; a bad API response at runtime would not.
    expect(() => assertNever({ state: 'exploded' } as never)).toThrow(/Unhandled variant/);
  });
});

describe('row -> domain mapping', () => {
  it('converts snake_case and Date into the app-facing shape', () => {
    const row: TaskRow = {
      id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      title: 'Ship it',
      description: null,
      priority: 'high',
      status: 'todo',
      assignee_id: null,
      due_date: new Date('2026-03-01T00:00:00Z'),
      created_at: new Date('2026-01-01T09:30:00Z'),
      updated_at: new Date('2026-01-02T09:30:00Z'),
    };

    expect(toTask(row)).toEqual({
      id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      title: 'Ship it',
      description: null,
      priority: 'high',
      status: 'todo',
      assigneeId: null,
      dueDate: '2026-03-01',
      createdAt: '2026-01-01T09:30:00.000Z',
      updatedAt: '2026-01-02T09:30:00.000Z',
    });
  });
});

describe('satisfies', () => {
  it('keeps literal types while still checking exhaustiveness', () => {
    // If you delete `high` from PRIORITY_LABELS, this file stops compiling.
    expect(PRIORITY_LABELS.high).toBe('High');
    expect(Object.keys(PRIORITY_LABELS).sort()).toEqual(['high', 'low', 'medium']);
  });
});

describe('generics and type predicates', () => {
  it('indexBy builds a lookup keyed on the chosen field', () => {
    const users = [
      { id: 'u1', name: 'Ada' },
      { id: 'u2', name: 'Grace' },
    ];

    expect(indexBy(users, 'id').get('u2')?.name).toBe('Grace');
    expect(indexBy(users, 'name').get('Ada')?.id).toBe('u1');
  });

  it('isPresent narrows away null and undefined', () => {
    const maybe: (string | null | undefined)[] = ['a', null, 'b', undefined];
    const present: string[] = maybe.filter(isPresent); // <- typed as string[]
    expect(present).toEqual(['a', 'b']);
  });

  it('isTaskStatus guards untrusted input', () => {
    expect(isTaskStatus('done')).toBe(true);
    expect(isTaskStatus('DONE')).toBe(false);
    expect(isTaskStatus(null)).toBe(false);
  });
});
