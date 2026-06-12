import { Loader2 } from "lucide-react";

export function SuspenseFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <img
          src="/sloti-symbol.svg"
          alt="Slotimob"
          className="h-10 w-10 animate-pulse"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    </div>
  );
}
