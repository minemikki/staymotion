'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AttachmentMeta } from '../domain/types';
import type { Actor, CreateOrganizationInput } from './provider';
import { storagePathFor } from '../lib/image';
import { SupabaseProvider } from './supabase-provider';

/**
 * Real-pilot additions kept as a thin subclass so the proven Phase-2 provider
 * stays easy to review. The browser still uses only the anon key; Storage and
 * Realtime are protected by RLS/policies from migrations 0002 + 0003.
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
