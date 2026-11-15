'use client';

import React from 'react';
import MuiButton from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { FileText, Paperclip, X } from 'lucide-react';
import type { StoredFile } from '@/types';
import { fileHref, fileSize } from '@/hooks/useUpload';

/** Links to files; optionally removable. */
export function FileList({ files, onRemove }: { files: StoredFile[]; onRemove?: (id: string) => void }) {
  if (!files.length) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
          <a href={fileHref(f.id)} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-semibold text-brand-700 hover:underline">
            {f.filename}
          </a>
          <span className="text-xs text-slate-500">{fileSize(f.size)}</span>
          {onRemove && (
            <IconButton size="small" aria-label={`Remove ${f.filename}`} onClick={() => onRemove(f.id)}>
              <X size={14} />
            </IconButton>
          )}
        </li>
      ))}
    </ul>
  );
}

/** "Attach files" button wired to a hidden file input. */
export function AttachButton({ onFiles, uploading, label = 'Attach files', accept }: { onFiles: (f: FileList | null) => void; uploading: boolean; label?: string; accept?: string }) {
  return (
    <MuiButton component="label" variant="outlined" color="inherit" loading={uploading} loadingPosition="start" startIcon={<Paperclip size={16} />} sx={{ borderColor: 'divider', alignSelf: 'flex-start' }}>
      {label}
      <input
        type="file"
        hidden
        multiple
        accept={accept ?? '.pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip'}
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </MuiButton>
  );
}
