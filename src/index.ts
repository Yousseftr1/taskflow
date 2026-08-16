import { createSupabaseClient } from './lib/supabase.js';
import { TasksService } from './tasks/tasks.service.js';

/**
 * A tiny demo entry point so the project is actually runnable:
 *
 *   npm start                    -> list tasks
 *   npm start -- add "My task"   -> create a task
 *   npm start -- done <id>       -> mark a task done
 *
 * The real teaching material is in ./docs — this file just gives us
 * something concrete to change in a pull request.
 */
async function main(): Promise<void> {
  const [command = 'list', ...rest] = process.argv.slice(2);
  const tasks = new TasksService(createSupabaseClient());

  switch (command) {
    case 'list': {
      const rows = await tasks.list();
      if (rows.length === 0) {
        console.info('No tasks yet. Add one with:  npm start -- add "My first task"');
        return;
      }
      for (const task of rows) {
        console.info(`[${task.status.padEnd(5)}] ${task.id.slice(0, 8)}  ${task.title}`);
      }
      return;
    }

    case 'add': {
      const created = await tasks.create({ title: rest.join(' ') });
      console.info(`Created ${created.id}: ${created.title}`);
      return;
    }

    case 'done': {
      const [id] = rest;
      const updated = await tasks.complete(id ?? '');
      console.info(`Completed ${updated.id}: ${updated.title}`);
      return;
    }

    default:
      console.error(`Unknown command "${command}". Try: list | add | done`);
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
