import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  MAX_LIST_LIMIT,
  MAX_TITLE_LENGTH,
  TaskRepositoryError,
  TaskValidationError,
  TasksService,
  normalizeLimit,
  normalizeNewTask,
} from './tasks.service.js';
import type { Task } from './types.js';

/** One recorded call against the fake Supabase query builder. */
interface RecordedCall {
  method: string;
  args: unknown[];
}

/**
 * A tiny fake Supabase client.
 *
 * Every builder method (`select`, `eq`, `order`, ...) records the call and
 * returns the builder again, so any chain works. The builder is "thenable",
 * so `await`-ing the end of a chain resolves to the canned result.
 *
 * This is why we inject the client into TasksService: no network, no real
 * project, tests run in milliseconds inside CI.
 */
function createSupabaseMock(result: { data: unknown; error: { message: string } | null }) {
  const calls: RecordedCall[] = [];

  const builder: any = {
    then(onFulfilled: (value: unknown) => unknown) {
      return Promise.resolve(result).then(onFulfilled);
    },
  };

  for (const method of ['insert', 'select', 'single', 'order', 'update', 'eq', 'delete', 'limit']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }

  const client = {
    from(table: string) {
      calls.push({ method: 'from', args: [table] });
      return builder;
    },
  };

  const argsFor = (method: string): unknown[] | undefined =>
    calls.find((call) => call.method === method)?.args;

  return { client: client as unknown as SupabaseClient, calls, argsFor };
}

const sampleTask: Task = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Write the deployment runbook',
  description: null,
  status: 'todo',
  created_at: '2026-08-16T09:00:00.000Z',
  completed_at: null,
};

describe('normalizeNewTask', () => {
  it('trims the title and defaults the status to "todo"', () => {
    const result = normalizeNewTask({ title: '  Ship the release  ' });

    expect(result).toEqual({
      title: 'Ship the release',
      description: null,
      status: 'todo',
    });
  });

  it('keeps an explicit status and a non-empty description', () => {
    const result = normalizeNewTask({
      title: 'Review PR #42',
      description: '  needs a second pair of eyes  ',
      status: 'doing',
    });

    expect(result.status).toBe('doing');
    expect(result.description).toBe('needs a second pair of eyes');
  });

  it('turns a whitespace-only description into null', () => {
    expect(normalizeNewTask({ title: 'A', description: '   ' }).description).toBeNull();
  });

  it('rejects an empty or whitespace-only title', () => {
    expect(() => normalizeNewTask({ title: '   ' })).toThrow(TaskValidationError);
    expect(() => normalizeNewTask({ title: '' })).toThrow(/title is required/i);
  });

  it(`rejects a title longer than ${MAX_TITLE_LENGTH} characters`, () => {
    const tooLong = 'x'.repeat(MAX_TITLE_LENGTH + 1);
    expect(() => normalizeNewTask({ title: tooLong })).toThrow(TaskValidationError);
  });

  it('accepts a title of exactly the maximum length', () => {
    const exact = 'x'.repeat(MAX_TITLE_LENGTH);
    expect(normalizeNewTask({ title: exact }).title).toHaveLength(MAX_TITLE_LENGTH);
  });
});

describe('normalizeLimit', () => {
  it('falls back to the default when no limit is given', () => {
    expect(normalizeLimit(undefined)).toBe(50);
  });

  it('clamps oversized limits', () => {
    expect(normalizeLimit(10_000)).toBe(MAX_LIST_LIMIT);
  });

  it('floors fractional limits', () => {
    expect(normalizeLimit(7.9)).toBe(7);
  });

  it('rejects zero, negative and non-finite limits', () => {
    expect(() => normalizeLimit(0)).toThrow(TaskValidationError);
    expect(() => normalizeLimit(-5)).toThrow(TaskValidationError);
    expect(() => normalizeLimit(Number.NaN)).toThrow(TaskValidationError);
  });
});

describe('TasksService.create', () => {
  it('inserts the normalized payload into the tasks table', async () => {
    const { client, argsFor } = createSupabaseMock({ data: sampleTask, error: null });

    const created = await new TasksService(client).create({ title: '  Write docs  ' });

    expect(created).toEqual(sampleTask);
    expect(argsFor('from')).toEqual(['tasks']);
    expect(argsFor('insert')).toEqual([
      { title: 'Write docs', description: null, status: 'todo' },
    ]);
  });

  it('never touches the database when validation fails', async () => {
    const { client, calls } = createSupabaseMock({ data: null, error: null });

    await expect(new TasksService(client).create({ title: '' })).rejects.toThrow(
      TaskValidationError,
    );
    expect(calls).toHaveLength(0);
  });

  it('wraps a database error in a TaskRepositoryError', async () => {
    const { client } = createSupabaseMock({
      data: null,
      error: { message: 'duplicate key value violates unique constraint' },
    });

    await expect(new TasksService(client).create({ title: 'Ship it' })).rejects.toThrow(
      TaskRepositoryError,
    );
  });

  it('fails loudly if the insert returns no row', async () => {
    const { client } = createSupabaseMock({ data: null, error: null });

    await expect(new TasksService(client).create({ title: 'Ship it' })).rejects.toThrow(
      /no row was returned/i,
    );
  });
});

describe('TasksService.list', () => {
  it('returns rows newest-first and applies the default limit', async () => {
    const { client, argsFor } = createSupabaseMock({ data: [sampleTask], error: null });

    const tasks = await new TasksService(client).list();

    expect(tasks).toEqual([sampleTask]);
    expect(argsFor('order')).toEqual(['created_at', { ascending: false }]);
    expect(argsFor('limit')).toEqual([50]);
  });

  it('filters by status when one is provided', async () => {
    const { client, argsFor } = createSupabaseMock({ data: [], error: null });

    await new TasksService(client).list({ status: 'done', limit: 5 });

    expect(argsFor('eq')).toEqual(['status', 'done']);
    expect(argsFor('limit')).toEqual([5]);
  });

  it('returns an empty array when Supabase returns null data', async () => {
    const { client } = createSupabaseMock({ data: null, error: null });

    await expect(new TasksService(client).list()).resolves.toEqual([]);
  });

  it('wraps a database error', async () => {
    const { client } = createSupabaseMock({ data: null, error: { message: 'timeout' } });

    await expect(new TasksService(client).list()).rejects.toThrow(TaskRepositoryError);
  });
});

describe('TasksService.complete', () => {
  it('marks the task done and stamps completed_at', async () => {
    const { client, argsFor } = createSupabaseMock({
      data: { ...sampleTask, status: 'done' },
      error: null,
    });
    const now = new Date('2026-08-16T12:34:56.000Z');

    const task = await new TasksService(client).complete(sampleTask.id, now);

    expect(task.status).toBe('done');
    expect(argsFor('update')).toEqual([
      { status: 'done', completed_at: '2026-08-16T12:34:56.000Z' },
    ]);
    expect(argsFor('eq')).toEqual(['id', sampleTask.id]);
  });

  it('rejects a blank id without calling the database', async () => {
    const { client, calls } = createSupabaseMock({ data: null, error: null });

    await expect(new TasksService(client).complete('  ')).rejects.toThrow(TaskValidationError);
    expect(calls).toHaveLength(0);
  });

  it('reports a missing task clearly', async () => {
    const { client } = createSupabaseMock({ data: null, error: null });

    await expect(new TasksService(client).complete('does-not-exist')).rejects.toThrow(
      /no task found/i,
    );
  });

  it('wraps a database error', async () => {
    const { client } = createSupabaseMock({ data: null, error: { message: 'deadlock' } });

    await expect(new TasksService(client).complete(sampleTask.id)).rejects.toThrow(
      TaskRepositoryError,
    );
  });
});

describe('TasksService.remove', () => {
  it('deletes by id', async () => {
    const { client, argsFor } = createSupabaseMock({ data: null, error: null });

    await new TasksService(client).remove(sampleTask.id);

    expect(argsFor('delete')).toEqual([]);
    expect(argsFor('eq')).toEqual(['id', sampleTask.id]);
  });

  it('rejects a blank id without calling the database', async () => {
    const { client, calls } = createSupabaseMock({ data: null, error: null });

    await expect(new TasksService(client).remove('')).rejects.toThrow(TaskValidationError);
    expect(calls).toHaveLength(0);
  });

  it('wraps a database error', async () => {
    const { client } = createSupabaseMock({ data: null, error: { message: 'permission denied' } });

    await expect(new TasksService(client).remove(sampleTask.id)).rejects.toThrow(
      TaskRepositoryError,
    );
  });
});
