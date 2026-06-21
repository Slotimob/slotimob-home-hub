import { cn } from '@/lib/utils';

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  background?: 'white' | 'muted' | 'primary';
}

const bgMap: Record<NonNullable<SectionWrapperProps['background']>, string> = {
  white: 'bg-background text-foreground',
  muted: 'bg-muted/30 text-foreground',
  primary: 'bg-primary text-primary-foreground',
};

export default function SectionWrapper({
  children,
  className,
  id,
  background = 'white',
}: SectionWrapperProps) {
  return (
    <section id={id} className={cn('py-16 md:py-24', bgMap[background], className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}
