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
      default: 'bg-white text-zinc-950 font-bold hover:bg-zinc-200 border border-white/20 shadow-sm',
      destructive: 'bg-rose-950/40 text-rose-300 font-medium hover:bg-rose-900/60 border border-rose-500/40',
      outline: 'border border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white backdrop-blur-sm',
      secondary: 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-white/10',
      ghost: 'hover:bg-white/10 text-zinc-300 hover:text-white',
      link: 'text-zinc-300 hover:text-white underline-offset-4 hover:underline',
      glow: 'bg-white text-zinc-950 font-bold hover:bg-zinc-200 shadow-[0_0_12px_rgba(255,255,255,0.4)]',
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
