'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-primary-900">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={cn(
          'block w-full rounded-lg border px-3 py-2 text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent',
          error ? 'border-red-500' : 'border-gray-300',
          className,
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  ),
);

Select.displayName = 'Select';
