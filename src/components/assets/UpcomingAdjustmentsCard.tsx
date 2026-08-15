import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdjustmentStatus } from "@/lib/lease-status";
import { Button } from "@/components/ui/button";
import { CalendarClock, AlertTriangle, ChevronRight, TrendingUp } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeaseWithAdjustment {
  id: string;
  unit_id: string;
  rent_amount: number;
  adjustment_index: string | null;
  next_adjustment_date: string | null;
  start_date: string;
  tenant_contact?: {
    name: string;
  } | null;
  unit?: {
    unit_number: string;
  } | null;
}

interface UpcomingAdjustmentsCardProps {
  leases: LeaseWithAdjustment[];
  onSelectLease: (lease: LeaseWithAdjustment) => void;
}

export function UpcomingAdjustmentsCard({
  leases,
  onSelectLease,
}: UpcomingAdjustmentsCardProps) {
  const today = new Date();

  // Fonte única: getAdjustmentStatus
  const upcomingAdjustments = leases
    .filter((lease) => getAdjustmentStatus(lease.next_adjustment_date) === "proximo")
    .sort((a, b) => {
    const dateA = parseISO(a.next_adjustment_date!);
    const dateB = parseISO(b.next_adjustment_date!);
    return dateA.getTime() - dateB.getTime();
  });

  // Overdue adjustments (should have been done)
  const overdueAdjustments = leases.filter(
    (lease) => getAdjustmentStatus(lease.next_adjustment_date) === "vencido"
  );

  if (upcomingAdjustments.length === 0 && overdueAdjustments.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          Reajustes Próximos (30 dias)
          <Badge variant="secondary" className="ml-auto">
            {upcomingAdjustments.length + overdueAdjustments.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Overdue first */}
        {overdueAdjustments.map((lease) => {
          const adjustmentDate = parseISO(lease.next_adjustment_date!);
          const daysOverdue = Math.abs(differenceInDays(adjustmentDate, today));

          return (
            <div
              key={lease.id}
              className="flex items-center justify-between p-2 rounded-lg bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/20 transition-colors"
              onClick={() => onSelectLease(lease)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {lease.unit?.unit_number}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {lease.tenant_contact?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="destructive" className="text-[10px]">
                  {daysOverdue}d atrasado
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          );
        })}

        {/* Upcoming */}
        {upcomingAdjustments.slice(0, 5).map((lease) => {
          const adjustmentDate = parseISO(lease.next_adjustment_date!);
          const daysUntil = differenceInDays(adjustmentDate, today);

          return (
            <div
              key={lease.id}
              className="flex items-center justify-between p-2 rounded-lg bg-card border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onSelectLease(lease)}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {lease.unit?.unit_number}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {lease.tenant_contact?.name} • {format(adjustmentDate, "dd/MM", { locale: ptBR })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge
                  variant={daysUntil === 0 ? "default" : daysUntil <= 7 ? "destructive" : "secondary"}
                  className="text-[10px]"
                >
                  {daysUntil === 0 ? "Hoje" : `${daysUntil}d`}
                </Badge>
                <Button 
                  variant={daysUntil <= 7 ? "destructive" : "outline"} 
                  size="sm" 
                  className="h-7 text-xs gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLease(lease);
                  }}
                >
                  <TrendingUp className="h-3 w-3" />
                  Reajustar
                </Button>
              </div>
            </div>
          );
        })}

        {upcomingAdjustments.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{upcomingAdjustments.length - 5} outros reajustes
          </p>
        )}
      </CardContent>
    </Card>
  );
}
