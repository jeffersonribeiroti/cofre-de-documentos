/**
 * Utilitários de Máscaras e Validação para Interface
 */

export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function validateCPFMath(cpfRaw: string): boolean {
  const clean = cpfRaw.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rest = (sum * 10) % 11;
  let d1 = rest === 10 || rest === 11 ? 0 : rest;
  if (d1 !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rest = (sum * 10) % 11;
  let d2 = rest === 10 || rest === 11 ? 0 : rest;
  return d2 === parseInt(clean.charAt(10), 10);
}

export interface PasswordRules {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
}

export function checkPasswordStrength(password: string): PasswordRules {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
  };
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatClassificationBadge(level: string): { label: string; bg: string; text: string; border: string } {
  switch (level) {
    case 'PUBLICO':
      return { label: 'PÚBLICO', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', border: 'border-emerald-300' };
    case 'INTERNO':
      return { label: 'INTERNO', bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', border: 'border-blue-300' };
    case 'CONFIDENCIAL':
      return { label: 'CONFIDENCIAL', bg: 'bg-amber-50 text-amber-800 border-amber-300', text: 'text-amber-800', border: 'border-amber-400' };
    case 'SIGILOSO':
      return { label: 'SIGILOSO', bg: 'bg-rose-50 text-rose-800 border-rose-300', text: 'text-rose-800', border: 'border-rose-400' };
    default:
      return { label: level, bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'text-slate-700', border: 'border-slate-300' };
  }
}
