import { useIsMobile } from "@/hooks/use-mobile";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrencyFull } from "@/hooks/useSmartCurrency";
import { cn } from "@/lib/utils";

interface BankAccount {
  id: string;
  name: string;
  bank_name: string | null;
  color: string | null;
  balance?: number;
  realBalance?: number;
}

interface BankAccountFilterProps {
  value: string;
  onChange: (value: string) => void;
  accounts: BankAccount[];
}

function getDisplayName(account: BankAccount): string {
  if (account.bank_name) return `${account.bank_name} · ${account.name}`;
  return account.name;
}

function getBalance(account: BankAccount): number {
  return account.realBalance ?? account.balance ?? 0;
}

export function BankAccountFilter({ value, onChange, accounts }: BankAccountFilterProps) {
  const isMobile = useIsMobile();
  const selectedAccount = value !== "all" ? accounts.find(a => a.id === value) : null;

  if (accounts.length === 0) return null;

  if (isMobile) {
    return (
      <div className="space-y-1">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Todas as contas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="text-xs">Todas as contas</span>
            </SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: account.color || "#10b981" }}
                  />
                  <span className="text-xs truncate">{getDisplayName(account)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedAccount && (
          <p className="text-[10px] text-muted-foreground">
            Saldo: {formatCurrencyFull(getBalance(selectedAccount))}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v)}
        className="flex flex-wrap justify-start gap-1"
      >
        <ToggleGroupItem
          value="all"
          className="h-8 px-3 text-xs rounded-full data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
        >
          Todas as contas
        </ToggleGroupItem>
        {accounts.map((account) => (
          <ToggleGroupItem
            key={account.id}
            value={account.id}
            className={cn(
              "h-8 px-3 text-xs rounded-full transition-colors",
              "data-[state=on]:text-foreground"
            )}
            style={
              value === account.id
                ? { backgroundColor: `${account.color || "#10b981"}26` }
                : undefined
            }
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: account.color || "#10b981" }}
              />
              <span className="truncate max-w-[120px]">{getDisplayName(account)}</span>
            </div>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {selectedAccount && (
        <p className="text-[10px] text-muted-foreground pl-1">
          Saldo: {formatCurrencyFull(getBalance(selectedAccount))}
        </p>
      )}
    </div>
  );
}
