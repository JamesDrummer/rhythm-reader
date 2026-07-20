import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhda-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bhda-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-bhda-purple text-white hover:bg-bhda-purple/90',
        outline:
          'border border-black/15 bg-transparent text-bhda-text hover:bg-black/5',
        ghost: 'text-bhda-text hover:bg-black/5',
      },
      size: {
        default: 'h-10 px-4 py-2',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({
  asChild = false,
  className,
  size,
  variant,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'

  return (
    <Component
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    />
  )
}
