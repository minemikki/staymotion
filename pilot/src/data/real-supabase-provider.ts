'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AttachmentMeta, Task } from '../domain/types';
import type { Actor, CreateOrganizationInput } from './provider';
import { storagePathFor } from '../lib/image';
import { SupabaseProvider } from './supabase-provider';

type Row = Record<string, unknown>;
const r = (row: Row) => row as Record<string, string | number | boolean | null | undefined>;
const mapTask = (x: Row): Task => ({
  id: r(x).id as string,
  organizationId: r(x).organization_id as string,
  locationId: r(x).location_id as string,
  departmentId: (r(x).department_id as string) || undefined,
  title: r(x).title as string,
  description: (r(x).description as string) || undefined,
  dueAt: (r(x).due_at as string) || undefined,
  status: r(x).status as Task['status'],
  assignedTo: (r(x).assigned_to as string) || undefined,
  assignedRole: (r(x).assigned_role as Task['assignedRole']) || undefined,
  automationKey: (r(x).automation_key as string) || undefined,
  estimatedMinutes: (r(x).estimated_minutes as number) || undefined,
  completedAt: (r(x).completed_at as string) || undefined,
  completedBy: (r(x).completed_by as string) || undefined,
  createdAt: r(x).created_at as string,
  updatedAt: r(x).updated_at as string,
});

/**
 * Real-pilot additions kept as a thin subclass so the proven Phase-2 provider
 * stays easy to review. The browser still uses only the anon key; Storage,
 * Realtime and task mutation are protected by RLS/RPCs from migrations 0002–0004.
 */
export class RealSupabaseProvider extends SupabaseProvider {
  constructor(private readonly client: SupabaseClient) {
    super(client);
  }

  override async createOrganization(input: CreateOrganizationInput) {
    const created = await super.createOrganization(input);

    // Phase 2 correctly bound ownership to auth.uid(), but the display name in
    // onboarding was not persisted in real mode. Self-update is allowed by RLS.
    const fullName = input.ownerName.trim();
    if (fullName) {
      const patch: Record<string, string> = { full_name: fullName };
      if (input.ownerEmail?.trim()) patch.email = input.ownerEmail.trim();
      const { error } = await this.client.from('profiles').update(patch).eq('id', created.owner.id);
      if (error) throw new Error(error.message);
      created.owner = { ...created.owner, fullName, email: input.ownerEmail?.trim() || created.owner.email };
    }
    return created;
  }

  /**
   * Employees no longer update the tasks table directly. The RPC locks the row,
   * verifies assignment/location access, mutates only completion fields and
   * writes the audit event in the same transaction.
   */
  override async completeTask(_actor: Actor, taskId: string): Promise<Task> {
    const { data, error } = await this.client.rpc('set_task_completion', { p_task_id: taskId, p_done: true });
    if (error) throw new Error(error.message);
    return mapTask(data as Row);
  }

  override async reopenTask(_actor: Actor, taskId: string): Promise<Task> {
    const { data, error } = await this.client.rpc('set_task_completion', { p_task_id: taskId, p_done: false });
    if (error) throw new Error(error.message);
    return mapTask(data as Row);
  }

  async uploadAttachment(actor: Actor, attachment: { meta: AttachmentMeta; blob: Blob }): Promise<AttachmentMeta> {
    if (!actor.locationId) throw new Error('Mangler lokasjon for bildet');
    const { meta, blob } = attachment;
    if (meta.sizeBytes > 6 * 1024 * 1024 || blob.size > 6 * 1024 * 1024) throw new Error('Bildet er for stort (maks 6 MB)');
    if (!meta.mimeType.startsWith('image/')) throw new Error('Filen må være et bilde');

    const path = storagePathFor(actor.organizationId, actor.locationId, actor.userId, meta);
    const { error } = await this.client.storage.from('incident-photos').upload(path, blob, {
      cacheControl: '3600',
      contentType: meta.mimeType || blob.type || 'image/jpeg',
      upsert: false,
    });
    if (error) throw new Error(`Kunne ikke laste opp bildet: ${error.message}`);

    return { ...meta, storagePath: path, previewUrl: undefined };
  }

  subscribeIncidentChanges(actor: Actor, scope: { organizationId: string; locationId?: string }, onChange: () => void): () => void {
    if (scope.organizationId !== actor.organizationId) return () => undefined;
    const name = `incidents:${scope.organizationId}:${scope.locationId || 'all'}:${actor.userId}`;
    const filter = scope.locationId ? `location_id=eq.${scope.locationId}` : `organization_id=eq.${scope.organizationId}`;

    const channel = this.client
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents', filter }, () => onChange())
      .subscribe();

    return () => { void this.client.removeChannel(channel); };
  }
}
