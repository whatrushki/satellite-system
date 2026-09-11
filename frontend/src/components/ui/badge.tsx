import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'purple'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'border-transparent bg-sky-500/20 text-sky-400 border border-sky-500/30',
    secondary: 'border-transparent bg-slate-800 text-slate-300',
    destructive: 'border-transparent bg-rose-500/20 text-rose-400 border border-rose-500/30',
    outline: 'text-slate-300 border border-slate-700',
    success: 'border-transparent bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    warning: 'border-transparent bg-amber-500/20 text-amber-400 border border-amber-500/30',
    purple: 'border-transparent bg-purple-500/20 text-purple-400 border border-purple-500/30',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors uppercase tracking-wider',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
