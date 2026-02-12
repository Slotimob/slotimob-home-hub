import { ReactNode } from 'react';
import { BottomNavigation } from '@/components/BottomNavigation';

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
}

export function MobileLayout({ children, className = '' }: MobileLayoutProps) {
  return (
    <>
      <div className={`pb-20 md:pb-0 ${className}`}>
        {children}
      </div>
      <BottomNavigation />
    </>
  );
}
