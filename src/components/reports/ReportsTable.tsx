import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReactNode } from 'react';

interface ReportsTableProps {
  title: string;
  icon: ReactNode;
  description: string;
  children: ReactNode;
}

export const ReportsTable = ({ title, icon, description, children }: ReportsTableProps) => {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {children}
        </div>
      </CardContent>
    </Card>
  );
};
