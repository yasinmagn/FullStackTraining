import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { boolEnv, intEnv, loadConfig, optionalEnv, requireEnv } from './config.mjs';
import { fromModule, parseTasks, readJsonFile, summarise, writeJsonFile } from './tasks.mjs';

describe('config', () => {
  it('throws a message that names the missing variable', () => {
    // The whole point: the error tells you what to fix, not "cannot read
    // property of undefined" three modules later.
    expect(() => requireEnv('DATABASE_URL', {})).toThrow(/Missing required environment variable: DATABASE_URL/);
  });

  it('treats an empty string as missing', () => {
    // A variable set to '' in a .env file is almost never intentional.
    expect(() => requireEnv('API_KEY', { API_KEY: '   ' })).toThrow(/API_KEY/);
  });

  it('falls back with ?? so that 0 and empty survive', () => {
    expect(optionalEnv('LOG_LEVEL', 'info', {})).toBe('info');
    expect(optionalEnv('LOG_LEVEL', 'info', { LOG_LEVEL: 'debug' })).toBe('debug');
  });

  it('rejects a non-integer rather than yielding NaN', () => {
    expect(intEnv('PORT', 3000, { PORT: '8080' })).toBe(8080);
    expect(intEnv('PORT', 3000, {})).toBe(3000);
    // parseInt('3 bananas') would have given you 3.
    expect(() => intEnv('PORT', 3000, { PORT: '3 bananas' })).toThrow(/must be an integer/);
  });

  it('parses booleans properly, because Boolean("false") is true', () => {
    expect(boolEnv('DEBUG', false, { DEBUG: 'true' })).toBe(true);
    expect(boolEnv('DEBUG', true, { DEBUG: 'false' })).toBe(false);
    expect(boolEnv('DEBUG', true, { DEBUG: '0' })).toBe(false);
    expect(() => boolEnv('DEBUG', false, { DEBUG: 'maybe' })).toThrow(/must be a boolean/);
  });

  it('builds a frozen config object', () => {
    const config = loadConfig({ NODE_ENV: 'production', PORT: '8080' });

    expect(config).toMatchObject({ nodeEnv: 'production', isProduction: true, port: 8080 });
    expect(config.features.verboseErrors).toBe(false); // off in production
    expect(Object.isFrozen(config)).toBe(true);
  });
});

describe('parseTasks', () => {
  const valid = [{ id: '1', title: 'A', priority: 'high', status: 'todo', estimateHours: 1 }];

  it('accepts a valid file', () => {
    expect(parseTasks(valid)).toEqual(valid);
  });

  it('rejects a non-array', () => {
    expect(() => parseTasks({ tasks: [] })).toThrow(/Expected the tasks file to contain an array/);
  });

  it('names the offending task in the error', () => {
    // A file on disk is external input. The error has to say WHICH record.
    expect(() => parseTasks([{ ...valid[0], status: 'DONE' }])).toThrow(
      /Task 1 has an invalid status: DONE/,
    );
  });

  it('rejects a missing numeric field instead of silently producing NaN later', () => {
    expect(() => parseTasks([{ ...valid[0], estimateHours: '2' }])).toThrow(/invalid estimateHours/);
  });
});

describe('summarise', () => {
  const tasks = parseTasks([
    { id: '1', title: 'A', priority: 'high', status: 'done', estimateHours: 1.5 },
    { id: '2', title: 'B', priority: 'low', status: 'todo', estimateHours: 2 },
    { id: '3', title: 'C', priority: 'low', status: 'in_progress', estimateHours: 0.5 },
  ]);

  it('counts by status and totals the hours', () => {
    expect(summarise(tasks)).toEqual({
      total: 3,
      byStatus: { todo: 1, in_progress: 1, done: 1 },
      totalHours: 4,
      remainingHours: 2.5,
      percentComplete: 33,
    });
  });

  it('rounds away floating point noise', () => {
    // 0.1 + 0.2 === 0.30000000000000004. Round at the presentation boundary.
    const noisy = parseTasks([
      { id: '1', title: 'A', priority: 'low', status: 'todo', estimateHours: 0.1 },
      { id: '2', title: 'B', priority: 'low', status: 'todo', estimateHours: 0.2 },
    ]);
    expect(summarise(noisy).totalHours).toBe(0.3);
  });

  it('handles an empty list without dividing by zero', () => {
    expect(summarise([])).toMatchObject({ total: 0, percentComplete: 0 });
  });
});

describe('file I/O', () => {
  it('reads and parses the shipped data file', async () => {
    const tasks = parseTasks(await readJsonFile(fromModule('..', 'data', 'tasks.json')));
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('reports a missing file by path, not by errno', async () => {
    await expect(readJsonFile('does/not/exist.json')).rejects.toThrow(/File not found/);
  });

  it('reports malformed JSON clearly', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'stage1-'));
    const file = join(dir, 'broken.json');
    await writeJsonFile(file, {});
    // Overwrite with garbage using the same helper's directory.
    const { writeFile } = await import('node:fs/promises');
    await writeFile(file, '{ not json', 'utf8');

    await expect(readJsonFile(file)).rejects.toThrow(/is not valid JSON/);
  });

  it('creates parent directories and ends the file with a newline', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'stage1-'));
    const file = join(dir, 'nested', 'deeper', 'out.json');

    await writeJsonFile(file, { ok: true });

    const contents = await readFile(file, 'utf8');
    expect(contents).toBe('{\n  "ok": true\n}\n');
  });
});
