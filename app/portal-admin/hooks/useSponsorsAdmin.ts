import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Sponsor } from '../types';

const SPONSOR_BUCKET = 'portal-sponsors';

export interface UseSponsorsAdminDeps {
  supabase: SupabaseClient;
  sponsors: Sponsor[];
  runAction: (action: () => Promise<void>) => Promise<void>;
  showToast: (msg: string) => void;
  setError: (msg: string) => void;
  refetch: () => Promise<void>;
}

export function useSponsorsAdmin({ supabase, sponsors, runAction, showToast, setError, refetch }: UseSponsorsAdminDeps) {
  function validateImage(file: File | null) {
    if (!file) return true;
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      setError('Only image files can be uploaded for sponsors.');
      return false;
    }
    return true;
  }

  async function uploadSponsorImage(file: File, sponsorName: string) {
    const safeName = sponsorName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const extension = file.name.split('.').pop() || 'png';
    const path = `sponsors/${Date.now()}-${safeName || 'sponsor'}.${extension}`;

    const uploadRes = await supabase.storage.from(SPONSOR_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || 'image/png',
    });

    if (uploadRes.error) {
      throw new Error(uploadRes.error.message || 'Failed to upload sponsor image.');
    }

    const publicRes = supabase.storage.from(SPONSOR_BUCKET).getPublicUrl(path);
    const imageUrl = publicRes.data.publicUrl || '';

    return { image_name: file.name, image_path: path, image_url: imageUrl };
  }

  async function tryRemoveStoredFile(bucket: string, filePath?: string) {
    if (!filePath) return;
    await supabase.storage.from(bucket).remove([filePath]);
  }

  // ── Create ───────────────────────────────────────────────────────────────────
  const [newSponsorName, setNewSponsorName] = useState('');
  const [newSponsorLink, setNewSponsorLink] = useState('');
  const [newSponsorPublished, setNewSponsorPublished] = useState(true);
  const [newSponsorSortOrder, setNewSponsorSortOrder] = useState('1');
  const [newSponsorImage, setNewSponsorImage] = useState<File | null>(null);

  function resetSponsorCreateFields() {
    setNewSponsorName('');
    setNewSponsorLink('');
    setNewSponsorPublished(true);
    setNewSponsorSortOrder(String(sponsors.length + 1));
    setNewSponsorImage(null);
  }

  async function handleCreateSponsor(e: React.FormEvent) {
    e.preventDefault();

    await runAction(async () => {
      if (!newSponsorName.trim()) {
        setError('Sponsor name is required.');
        return;
      }

      if (!validateImage(newSponsorImage)) return;

      let imageData: Partial<Sponsor> = {};

      if (newSponsorImage) {
        imageData = await uploadSponsorImage(newSponsorImage, newSponsorName.trim());
      }

      const { error: insertError } = await supabase.from('portal_sponsors').insert([
        {
          name: newSponsorName.trim(),
          sponsor_link: newSponsorLink.trim(),
          is_published: newSponsorPublished,
          sort_order: Number(newSponsorSortOrder) || 0,
          ...imageData,
        },
      ]);

      if (insertError) {
        if ('image_path' in imageData && imageData.image_path) {
          await tryRemoveStoredFile(SPONSOR_BUCKET, imageData.image_path);
        }
        setError(insertError.message || 'Failed to create sponsor.');
        return;
      }

      resetSponsorCreateFields();
      showToast('Sponsor created.');
      await refetch();
    });
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [editSponsorName, setEditSponsorName] = useState('');
  const [editSponsorLink, setEditSponsorLink] = useState('');
  const [editSponsorPublished, setEditSponsorPublished] = useState(true);
  const [editSponsorSortOrder, setEditSponsorSortOrder] = useState('1');
  const [editSponsorImage, setEditSponsorImage] = useState<File | null>(null);

  function resetSponsorEditFields() {
    setEditingSponsorId(null);
    setEditSponsorName('');
    setEditSponsorLink('');
    setEditSponsorPublished(true);
    setEditSponsorSortOrder('1');
    setEditSponsorImage(null);
  }

  function startEditSponsor(sponsor: Sponsor) {
    setEditingSponsorId(sponsor.id);
    setEditSponsorName(sponsor.name);
    setEditSponsorLink(sponsor.sponsor_link);
    setEditSponsorPublished(sponsor.is_published);
    setEditSponsorSortOrder(String(sponsor.sort_order));
    setEditSponsorImage(null);
  }

  async function handleSaveSponsor(id: string) {
    await runAction(async () => {
      if (!editSponsorName.trim()) {
        setError('Sponsor name is required.');
        return;
      }

      if (!validateImage(editSponsorImage)) return;

      const currentSponsor = sponsors.find((sponsor) => sponsor.id === id);
      if (!currentSponsor) {
        setError('Sponsor not found.');
        return;
      }

      let imageData: Partial<Sponsor> = {
        image_name: currentSponsor.image_name,
        image_path: currentSponsor.image_path,
        image_url: currentSponsor.image_url,
      };

      if (editSponsorImage) {
        const uploaded = await uploadSponsorImage(editSponsorImage, editSponsorName.trim());
        imageData = uploaded;
      }

      const { error: updateError } = await supabase
        .from('portal_sponsors')
        .update({
          name: editSponsorName.trim(),
          sponsor_link: editSponsorLink.trim(),
          is_published: editSponsorPublished,
          sort_order: Number(editSponsorSortOrder) || 0,
          ...imageData,
        })
        .eq('id', id);

      if (updateError) {
        if (editSponsorImage && 'image_path' in imageData && imageData.image_path && imageData.image_path !== currentSponsor.image_path) {
          await tryRemoveStoredFile(SPONSOR_BUCKET, imageData.image_path);
        }
        setError(updateError.message || 'Failed to update sponsor.');
        return;
      }

      if (editSponsorImage && currentSponsor.image_path && currentSponsor.image_path !== imageData.image_path) {
        await tryRemoveStoredFile(SPONSOR_BUCKET, currentSponsor.image_path);
      }

      showToast('Sponsor updated.');
      resetSponsorEditFields();
      await refetch();
    });
  }

  async function handleDeleteSponsor(id: string) {
    const confirmed = window.confirm('Delete this sponsor?');
    if (!confirmed) return;

    await runAction(async () => {
      const currentSponsor = sponsors.find((sponsor) => sponsor.id === id);

      const { error: deleteError } = await supabase.from('portal_sponsors').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete sponsor.');
        return;
      }

      if (currentSponsor?.image_path) {
        await tryRemoveStoredFile(SPONSOR_BUCKET, currentSponsor.image_path);
      }

      showToast('Sponsor deleted.');
      await refetch();
    });
  }

  return {
    newSponsorName, setNewSponsorName, newSponsorLink, setNewSponsorLink,
    newSponsorPublished, setNewSponsorPublished, newSponsorImage, setNewSponsorImage,
    handleCreateSponsor,
    editingSponsorId, editSponsorName, setEditSponsorName, editSponsorLink, setEditSponsorLink,
    editSponsorPublished, setEditSponsorPublished, editSponsorImage, setEditSponsorImage,
    handleSaveSponsor, resetSponsorEditFields, startEditSponsor, handleDeleteSponsor,
  };
}
