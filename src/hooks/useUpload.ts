'use client';

import { useState } from 'react';
import type { FilePurpose, StoredFile } from '@/types';

/** Upload files one by one to /api/files; keeps the list of uploaded files and the last error. */
export function useUpload(purpose: FilePurpose, max = 5) {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    setUploading(true);
    try {
      for (const f of Array.from(list)) {
        if (files.length >= max) {
          setError(`At most ${max} files.`);
          break;
        }
        const form = new FormData();
        form.append('file', f);
        form.append('purpose', purpose);
        const res = await fetch('/api/files', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || `Could not upload ${f.name}.`);
          break;
        }
        setFiles((prev) => [...prev, data.file]);
      }
    } finally {
      setUploading(false);
    }
  };

  const remove = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));
  const reset = (initial: StoredFile[] = []) => {
    setFiles(initial);
    setError(null);
  };
  return { files, uploading, error, add, remove, reset };
}

export const fileHref = (id: string) => `/api/files/${id}`;
export const fileSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
