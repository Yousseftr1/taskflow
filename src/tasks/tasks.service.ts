import type { SupabaseClient } from '@supabase/supabase-js';
import type { ListOptions, NewTask, Task } from './types.js';

export const TASKS_TABLE = 'tasks';
export const MAX_TITLE_LENGTH = 120;
export const DEFAULT_LIST_LIMIT = 50;
export const MAX_LIST_LIMIT = 200;

/** Thrown when the caller sends us something invalid. Never the database's fault. */
export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskValidationError';
  }
}

/** Thrown when Supabase returns an error, or returns nothing when we expected a row. */
export class TaskRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskRepositoryError';
  }
}

/**
 * Validates and cleans up user input before it ever reaches the database.
 *
 * Pure function: no network, no database, no clock. That is exactly what makes
 * it trivial to unit test — and unit tests are what our CI pipeline runs on
 * every pull request.
 */
export function normalizeNewTask(input: NewTask): Required<NewTask> {
  const title = input.title?.trim() ?? '';

  if (title.length === 0) {
    throw new TaskValidationError('Task title is required.');
  }

  if (title.length > MAX_TITLE_LENGTH) {
    throw new TaskValidationError(
      `Task title must be ${MAX_TITLE_LENGTH} characters or fewer (got ${title.length}).`,
    );
  }

  const description = input.description?.trim();

  return {
    title,
    description: description && description.length > 0 ? description : null,
    status: input.status ?? 'todo',
  };
}

/** Clamps a caller-supplied limit into a range the database is happy with. */
export function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIST_LIMIT;
  if (!Number.isFinite(limit) || limit < 1) {
    throw new TaskValidationError('Limit must be a positive number.');
  }
  return Math.min(Math.floor(limit), MAX_LIST_LIMIT);
}

/**
 * All database access for tasks lives here.
 *
 * The Supabase client is injected rather than imported, so tests can pass a
 * fake client and run instantly with no network and no real project.
 */
export class TasksService {
  constructor(private readonly db: SupabaseClient) {}

  async create(input: NewTask): Promise<Task> {
    const payload = normalizeNewTask(input);

    const { data, error } = await this.db
      .from(TASKS_TABLE)
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new TaskRepositoryError(`Failed to create task: ${error.message}`);
    }
    if (!data) {
      throw new TaskRepositoryError('Task was created but no row was returned.');
    }

    return data as Task;
  }

  async list(options: ListOptions = {}): Promise<Task[]> {
    const limit = normalizeLimit(options.limit);

    let query = this.db.from(TASKS_TABLE).select('*');

    if (options.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new TaskRepositoryError(`Failed to list tasks: ${error.message}`);
    }

    return (data ?? []) as Task[];
  }

  async complete(id: string, now: Date = new Date()): Promise<Task> {
    if (!id?.trim()) {
      throw new TaskValidationError('Task id is required.');
    }

    const { data, error } = await this.db
      .from(TASKS_TABLE)
      .update({ status: 'done', completed_at: now.toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new TaskRepositoryError(`Failed to complete task: ${error.message}`);
    }
    if (!data) {
      throw new TaskRepositoryError(`No task found with id "${id}".`);
    }

    return data as Task;
  }

  async remove(id: string): Promise<void> {
    if (!id?.trim()) {
      throw new TaskValidationError('Task id is required.');
    }

    const { error } = await this.db.from(TASKS_TABLE).delete().eq('id', id);

    if (error) {
      throw new TaskRepositoryError(`Failed to delete task: ${error.message}`);
    }
  }
}
