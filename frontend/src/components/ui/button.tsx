import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'glow'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer'

    const variants = {
      default: 'bg-sky-600 text-white font-medium hover:bg-sky-500 border border-sky-500/40',
      destructive: 'bg-rose-600 text-white font-medium hover:bg-rose-500 border border-rose-500/40',
      outline: 'border border-slate-700/90 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white',
      secondary: 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/50',
      ghost: 'hover:bg-slate-800 text-slate-300 hover:text-white',
      link: 'text-sky-400 underline-offset-4 hover:underline',
      glow: 'bg-emerald-600 text-white font-medium hover:bg-emerald-500 border border-emerald-500/40',
    }

    const sizes = {
      default: 'h-8 px-3 py-1.5',
      sm: 'h-7 rounded px-2.5 text-xs',
      lg: 'h-9 rounded-md px-5 text-sm',
      icon: 'h-8 w-8',
    }

    return (
      <button className={cn(base, variants[variant], sizes[size], className)} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'
