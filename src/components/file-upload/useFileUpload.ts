'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileUploadConfig, UploadedFile } from './fileUpload.types';
import { generateId, isDuplicateFile, isImageFile, isPdfPasswordProtected, unlockPdf, validateFile } from './fileUpload.utils';
import { friendlyErrorMessage } from '@/utils/errorMessage';

export function useFileUpload(config: FileUploadConfig) {
  const [files, setFiles] = useState<UploadedFile[]>(() => config.initialFiles ?? []);
  const urlsRef = useRef<Set<string>>(new Set());
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    setFiles((prev) => {
      let changed = false;
      const next = prev.map((f) => {
        if (
          f.file &&
          !f.isValidationError &&
          isImageFile(f.file) &&
          f.previewUrl?.startsWith('blob:')
        ) {
          try { URL.revokeObjectURL(f.previewUrl); } catch { /* ignore */ }
          const url = URL.createObjectURL(f.file);
          urlsRef.current.add(url);
          changed = true;
          return { ...f, previewUrl: url };
        }
        return f;
      });
      return changed ? next : prev;
    });
    const urls = urlsRef.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
    };
  }, []);

  const runUpload = useCallback((id: string, file: File) => {
    const cfg = configRef.current;

    if (cfg.uploadFn) {
      cfg.uploadFn(file, progress => {
        setFiles(prev =>
          prev.map(f => (f.id === id ? { ...f, progress: Math.round(progress) } : f))
        );
      })
        .then(() => {
          setFiles(prev =>
            prev.map(f => (f.id === id ? { ...f, status: 'success', progress: 100 } : f))
          );
        })
        .catch((err: unknown) => {
          setFiles(prev =>
            prev.map(f =>
              f.id === id
                ? { ...f, status: 'error', errorMessage: friendlyErrorMessage(err, 'Upload failed') }
                : f
            )
          );
        });
      return;
    }

    // Simulated upload progress
    let pct = 0;
    const step = () => {
      pct = Math.min(pct + (Math.random() * 18 + 8), 94);
      setFiles(prev =>
        prev.map(f => (f.id === id ? { ...f, progress: Math.round(pct) } : f))
      );
      if (pct < 94) {
        setTimeout(step, 150 + Math.random() * 120);
      } else {
        setTimeout(() => {
          setFiles(prev =>
            prev.map(f => (f.id === id ? { ...f, status: 'success', progress: 100 } : f))
          );
        }, 350);
      }
    };
    setTimeout(step, 80);
  }, []);

  const addFiles = useCallback(
    async (incoming: File[]) => {
      const cfg = configRef.current;
      if (cfg.disabled) return;

      const toProcess = cfg.multiple ? incoming : incoming.slice(0, 1);
      const toAdd: UploadedFile[] = [];

      for (const file of toProcess) {
        if (cfg.multiple && isDuplicateFile(file, files)) continue;

        const error = validateFile(file, cfg);

        if (!error) {
          const passwordProtected = await isPdfPasswordProtected(file);
          if (passwordProtected) {
            toAdd.push({
              id: generateId(),
              file,
              status: 'error',
              isPasswordProtected: true,
              isValidationError: false,
              progress: 0,
            });
            continue;
          }
        }

        let previewUrl: string | undefined;
        if (!error && isImageFile(file)) {
          previewUrl = URL.createObjectURL(file);
          urlsRef.current.add(previewUrl);
        }

        toAdd.push({
          id: generateId(),
          file,
          status: error ? 'error' : 'uploading',
          isValidationError: !!error,
          progress: 0,
          previewUrl,
          errorMessage: error ?? undefined,
        });
      }

      if (toAdd.length === 0) return;

      if (!cfg.multiple) {
        setFiles(prev => {
          prev.forEach(f => {
            if (f.previewUrl) {
              URL.revokeObjectURL(f.previewUrl);
              urlsRef.current.delete(f.previewUrl);
            }
          });
          return toAdd;
        });
      } else {
        setFiles(prev => [...prev, ...toAdd]);
      }

      toAdd.filter(f => !f.isValidationError && !f.isPasswordProtected).forEach(f => runUpload(f.id, f.file));
    },
    [files, runUpload]
  );

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const found = prev.find(f => f.id === id);
      if (found?.previewUrl) {
        URL.revokeObjectURL(found.previewUrl);
        urlsRef.current.delete(found.previewUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const retryFile = useCallback(
    (id: string) => {
      const found = files.find(f => f.id === id);
      // Only retry network failures, not validation errors
      if (!found || found.isValidationError) return;
      setFiles(prev =>
        prev.map(f =>
          f.id === id ? { ...f, status: 'uploading', progress: 0, errorMessage: undefined } : f
        )
      );
      runUpload(id, found.file);
    },
    [files, runUpload]
  );

  const unlockFile = useCallback(
    async (id: string, password: string) => {
      const found = files.find(f => f.id === id);
      if (!found || !found.isPasswordProtected) return;

      setFiles(prev =>
        prev.map(f =>
          f.id === id ? { ...f, isUnlocking: true, passwordError: undefined } : f
        )
      );

      try {
        const unlockedFile = await unlockPdf(found.file, password);

        const newEntry: UploadedFile = {
          id,
          file: unlockedFile,
          status: 'uploading',
          progress: 0,
          isPasswordProtected: false,
          isUnlocking: false,
          isValidationError: false,
        };

        setFiles(prev => prev.map(f => (f.id === id ? newEntry : f)));
        runUpload(id, unlockedFile);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const passwordError =
          msg === 'WRONG_PASSWORD'
            ? 'Incorrect password. Please try again.'
            : 'Unable to unlock automatically. Please remove the password manually and re-upload.';

        setFiles(prev =>
          prev.map(f =>
            f.id === id ? { ...f, isUnlocking: false, passwordError } : f
          )
        );
      }
    },
    [files, runUpload]
  );

  useEffect(() => {
    configRef.current.onFilesChange?.(files);
  }, [files]);

  return { files, addFiles, removeFile, retryFile, unlockFile };
}
