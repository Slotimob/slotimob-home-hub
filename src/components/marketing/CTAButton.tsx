import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CTAButtonProps {
  children: React.ReactNode;
  href: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  external?: boolean;
}

const variantMap = {
  primary: 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-md',
  secondary: 'border border-primary text-primary bg-transparent hover:bg-primary/5',
  ghost: 'text-primary hover:underline',
} as const;

const sizeMap = {
  sm: 'text-sm px-4 py-2',
  md: 'text-base px-6 py-3',
  lg: 'text-lg px-8 py-4',
} as const;

export default function CTAButton({
  children,
  href,
  variant = 'primary',
  size = 'md',
  className,
  external = false,
}: CTAButtonProps) {
  const classes = cn(
    'rounded-lg font-semibold transition-all duration-200 inline-flex items-center gap-2',
    variantMap[variant],
    sizeMap[size],
    className,
  );

  const isInternal = !external && href.startsWith('/');

  if (isInternal) {
    return (
      <Link to={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={classes}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
}
