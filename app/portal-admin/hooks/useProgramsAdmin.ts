import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Program } from '../types';

const PROGRAM_BUCKET = 'portal-programs';

export interface UseProgramsAdminDeps {
  supabase: SupabaseClient;
  programs: Program[];
  runAction: (action: () => Promise<void>) => Promise<void>;
  showToast: (msg: string) => void;
  setError: (msg: string) => void;
  refetch: () => Promise<void>;
}

export function useProgramsAdmin({ supabase, programs, runAction, showToast, setError, refetch }: UseProgramsAdminDeps) {
  function validatePdf(file: File | null) {
    if (!file) return true;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Only PDF files can be uploaded for programs.');
      return false;
    }
    return true;
  }

  async function uploadProgramPdf(file: File, programTitle: string) {
    const safeTitle = programTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const extension = file.name.split('.').pop() || 'pdf';
    const path = `programs/${Date.now()}-${safeTitle || 'program'}.${extension}`;

    const uploadRes = await supabase.storage.from(PROGRAM_BUCKET).upload(path, file, {
      upsert: false,
      contentType: 'application/pdf',
    });

    if (uploadRes.error) {
      throw new Error(uploadRes.error.message || 'Failed to upload PDF.');
    }

    const publicRes = supabase.storage.from(PROGRAM_BUCKET).getPublicUrl(path);
    const fileUrl = publicRes.data.publicUrl || '';

    return { file_name: file.name, file_path: path, file_url: fileUrl };
  }

  async function tryRemoveStoredFile(bucket: string, filePath?: string) {
    if (!filePath) return;
    await supabase.storage.from(bucket).remove([filePath]);
  }

  // ── Create ───────────────────────────────────────────────────────────────────
  const [newProgramTitle, setNewProgramTitle] = useState('');
  const [newProgramCategory, setNewProgramCategory] = useState('Gym');
  const [newProgramDayLabel, setNewProgramDayLabel] = useState('Monday');
  const [newProgramDetails, setNewProgramDetails] = useState('');
  const [newProgramPublished, setNewProgramPublished] = useState(true);
  const [newProgramSortOrder, setNewProgramSortOrder] = useState('1');
  const [newProgramFile, setNewProgramFile] = useState<File | null>(null);

  function resetProgramCreateFields() {
    setNewProgramTitle('');
    setNewProgramCategory('Gym');
    setNewProgramDayLabel('Monday');
    setNewProgramDetails('');
    setNewProgramPublished(true);
    setNewProgramSortOrder(String(programs.length + 1));
    setNewProgramFile(null);
  }

  async function handleCreateProgram(e: React.FormEvent) {
    e.preventDefault();

    await runAction(async () => {
      if (programs.length >= 4) {
        setError('Maximum 4 programs at a time. Delete one first if you want another.');
        return;
      }

      if (!newProgramTitle.trim()) {
        setError('Program title is required.');
        return;
      }

      if (!validatePdf(newProgramFile)) return;

      let fileData: Partial<Program> = {};

      if (newProgramFile) {
        fileData = await uploadProgramPdf(newProgramFile, newProgramTitle.trim());
      }

      const { error: insertError } = await supabase.from('portal_programs').insert([
        {
          title: newProgramTitle.trim(),
          category: newProgramCategory,
          day_label: newProgramDayLabel,
          details: newProgramDetails.trim(),
          is_published: newProgramPublished,
          sort_order: Number(newProgramSortOrder) || 0,
          ...fileData,
        },
      ]);

      if (insertError) {
        if ('file_path' in fileData && fileData.file_path) {
          await tryRemoveStoredFile(PROGRAM_BUCKET, fileData.file_path);
        }
        setError(insertError.message || 'Failed to create program.');
        return;
      }

      resetProgramCreateFields();
      showToast('Program created.');
      await refetch();
    });
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [editProgramTitle, setEditProgramTitle] = useState('');
  const [editProgramCategory, setEditProgramCategory] = useState('Gym');
  const [editProgramDayLabel, setEditProgramDayLabel] = useState('Monday');
  const [editProgramDetails, setEditProgramDetails] = useState('');
  const [editProgramPublished, setEditProgramPublished] = useState(true);
  const [editProgramSortOrder, setEditProgramSortOrder] = useState('1');
  const [editProgramFile, setEditProgramFile] = useState<File | null>(null);

  function resetProgramEditFields() {
    setEditingProgramId(null);
    setEditProgramTitle('');
    setEditProgramCategory('Gym');
    setEditProgramDayLabel('Monday');
    setEditProgramDetails('');
    setEditProgramPublished(true);
    setEditProgramSortOrder('1');
    setEditProgramFile(null);
  }

  function startEditProgram(program: Program) {
    setEditingProgramId(program.id);
    setEditProgramTitle(program.title);
    setEditProgramCategory(program.category);
    setEditProgramDayLabel(program.day_label || 'Monday');
    setEditProgramDetails(program.details);
    setEditProgramPublished(program.is_published);
    setEditProgramSortOrder(String(program.sort_order));
    setEditProgramFile(null);
  }

  async function handleSaveProgram(id: string) {
    await runAction(async () => {
      if (!editProgramTitle.trim()) {
        setError('Program title is required.');
        return;
      }

      if (!validatePdf(editProgramFile)) return;

      const currentProgram = programs.find((program) => program.id === id);
      if (!currentProgram) {
        setError('Program not found.');
        return;
      }

      let fileData: Partial<Program> = {
        file_name: currentProgram.file_name,
        file_path: currentProgram.file_path,
        file_url: currentProgram.file_url,
      };

      if (editProgramFile) {
        const uploaded = await uploadProgramPdf(editProgramFile, editProgramTitle.trim());
        fileData = uploaded;
      }

      const { error: updateError } = await supabase
        .from('portal_programs')
        .update({
          title: editProgramTitle.trim(),
          category: editProgramCategory,
          day_label: editProgramDayLabel,
          details: editProgramDetails.trim(),
          is_published: editProgramPublished,
          sort_order: Number(editProgramSortOrder) || 0,
          ...fileData,
        })
        .eq('id', id);

      if (updateError) {
        if (editProgramFile && 'file_path' in fileData && fileData.file_path && fileData.file_path !== currentProgram.file_path) {
          await tryRemoveStoredFile(PROGRAM_BUCKET, fileData.file_path);
        }
        setError(updateError.message || 'Failed to update program.');
        return;
      }

      if (editProgramFile && currentProgram.file_path && currentProgram.file_path !== fileData.file_path) {
        await tryRemoveStoredFile(PROGRAM_BUCKET, currentProgram.file_path);
      }

      showToast('Program updated.');
      resetProgramEditFields();
      await refetch();
    });
  }

  async function handleDeleteProgram(id: string) {
    const confirmed = window.confirm('Delete this program?');
    if (!confirmed) return;

    await runAction(async () => {
      const currentProgram = programs.find((program) => program.id === id);

      const { error: deleteError } = await supabase.from('portal_programs').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete program.');
        return;
      }

      if (currentProgram?.file_path) {
        await tryRemoveStoredFile(PROGRAM_BUCKET, currentProgram.file_path);
      }

      showToast('Program deleted.');
      await refetch();
    });
  }

  return {
    newProgramTitle, setNewProgramTitle, newProgramCategory, setNewProgramCategory,
    newProgramDayLabel, setNewProgramDayLabel, newProgramDetails, setNewProgramDetails,
    newProgramPublished, setNewProgramPublished, newProgramFile, setNewProgramFile,
    handleCreateProgram,
    editingProgramId, editProgramTitle, setEditProgramTitle, editProgramCategory, setEditProgramCategory,
    editProgramDayLabel, setEditProgramDayLabel, editProgramDetails, setEditProgramDetails,
    editProgramPublished, setEditProgramPublished, editProgramFile, setEditProgramFile,
    handleSaveProgram, resetProgramEditFields, startEditProgram, handleDeleteProgram,
  };
}
