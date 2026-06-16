import { createRef } from 'react';
import type { Toast } from 'primereact/toast';

// Module-level ref assigned by the <Toast> component in providers.tsx
export const toastRef = createRef<Toast>();

type Opts = { autoClose?: number; summary?: string; position?: string } | undefined;

function show(
  severity: 'success' | 'info' | 'warn' | 'error',
  detail: string,
  opts?: Opts,
) {
  toastRef.current?.show({
    severity,
    summary: opts?.summary,
    detail,
    life: opts?.autoClose ?? 3500,
    closable: true,
  });
}

export const toast = {
  success: (msg: string, opts?: Opts) => show('success', msg, opts),
  error:   (msg: string, opts?: Opts) => show('error',   msg, opts),
  danger:  (msg: string, opts?: Opts) => show('error',   msg, opts),
  info:    (msg: string, opts?: Opts) => show('info',    msg, opts),
  warning: (msg: string, opts?: Opts) => show('warn',    msg, opts),
  warn:    (msg: string, opts?: Opts) => show('warn',    msg, opts),
};
