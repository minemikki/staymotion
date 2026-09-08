import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { RealSupabaseProvider } from '../../src/data/real-supabase-provider';

const taskRow = {
  id: 'task_1',
  organization_id: 'org_1',
  location_id: 'loc_1',
  department_id: 'dep_1',
  title: 'Sjekk kjøletemperatur',
  description: 'Før åpning',
  due_at: '2026-09-08T08:00:00.000Z',
  status: 'done',
  assigned_to: 'usr_1',
  assigned_role: 'employee',
  automation_key: 'temp_check',
  estimated_minutes: 2,
  completed_at: '2026-09-08T08:01:00.000Z',
  completed_by: 'usr_1',
  created_at: '2026-09-08T07:00:00.000Z',
  updated_at: '2026-09-08T08:01:00.000Z',
};

function provider() {
  const rpc = vi.fn(async (_name: string, args: Record<string, unknown>) => ({
    data: { ...taskRow, status: args.p_done ? 'done' : 'open', completed_at: args.p_done ? taskRow.completed_at : null, completed_by: args.p_done ? taskRow.completed_by : null },
    error: null,
  }));
  const fake = { rpc } as unknown as SupabaseClient;
  return { db: new RealSupabaseProvider(fake), rpc };
}

const actor = { userId: 'usr_1', organizationId: 'org_1', locationId: 'loc_1', role: 'employee' as const };

describe('RealSupabaseProvider task mutations', () => {
  it('completes through the scoped set_task_completion RPC', async () => {
    const { db, rpc } = provider();
    const task = await db.completeTask(actor, 'task_1');

    expect(rpc).toHaveBeenCalledWith('set_task_completion', { p_task_id: 'task_1', p_done: true });
    expect(task.status).toBe('done');
    expect(task.completedBy).toBe('usr_1');
  });

  it('reopens through the same scoped RPC instead of a direct table update', async () => {
    const { db, rpc } = provider();
    const task = await db.reopenTask(actor, 'task_1');

    expect(rpc).toHaveBeenCalledWith('set_task_completion', { p_task_id: 'task_1', p_done: false });
    expect(task.status).toBe('open');
    expect(task.completedBy).toBeUndefined();
  });
});
