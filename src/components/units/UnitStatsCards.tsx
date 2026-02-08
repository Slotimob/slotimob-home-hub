import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UNIT_STATUS_STYLES } from '@/utils/uiConstants';

interface UnitStats {
  total: number;
  available: number;
  reserved: number;
  rented: number;
  sold: number;
}

interface UnitStatsCardsProps {
  stats: UnitStats;
}

export const UnitStatsCards = ({ stats }: UnitStatsCardsProps) => {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>
      
      <Card className={cn("relative overflow-hidden", stats.available > 0 && "border-green-500/30")}>
        <div className={cn(
          "absolute inset-0 opacity-10 pointer-events-none",
          stats.available > 0 && "bg-gradient-to-br from-green-500/20 to-transparent"
        )} />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{UNIT_STATUS_STYLES.available.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", UNIT_STATUS_STYLES.available.textClass)}>{stats.available}</div>
        </CardContent>
      </Card>
      
      <Card className={cn("relative overflow-hidden", stats.reserved > 0 && "border-yellow-500/30")}>
        <div className={cn(
          "absolute inset-0 opacity-10 pointer-events-none",
          stats.reserved > 0 && "bg-gradient-to-br from-yellow-500/20 to-transparent"
        )} />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{UNIT_STATUS_STYLES.reserved.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", UNIT_STATUS_STYLES.reserved.textClass)}>{stats.reserved}</div>
        </CardContent>
      </Card>
      
      <Card className={cn("relative overflow-hidden", stats.rented > 0 && "border-blue-500/30")}>
        <div className={cn(
          "absolute inset-0 opacity-10 pointer-events-none",
          stats.rented > 0 && "bg-gradient-to-br from-blue-500/20 to-transparent"
        )} />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{UNIT_STATUS_STYLES.rented.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", UNIT_STATUS_STYLES.rented.textClass)}>{stats.rented}</div>
        </CardContent>
      </Card>
      
      <Card className={cn("relative overflow-hidden", stats.sold > 0 && "border-red-500/30")}>
        <div className={cn(
          "absolute inset-0 opacity-10 pointer-events-none",
          stats.sold > 0 && "bg-gradient-to-br from-red-500/20 to-transparent"
        )} />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{UNIT_STATUS_STYLES.sold.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", UNIT_STATUS_STYLES.sold.textClass)}>{stats.sold}</div>
        </CardContent>
      </Card>
    </div>
  );
};