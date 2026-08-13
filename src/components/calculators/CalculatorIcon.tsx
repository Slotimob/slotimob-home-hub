import {
  Home,
  Calculator,
  TrendingUp,
  Percent,
  PiggyBank,
  Receipt,
  Scale,
  Landmark,
  LineChart,
  Coins,
  HardHat,
  Building2,
  TrendingDown,
  ArrowRightLeft,
  FileWarning,
  Truck,
  Package,
  type LucideProps,
} from 'lucide-react';

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  Home,
  Calculator,
  TrendingUp,
  Percent,
  PiggyBank,
  Receipt,
  Scale,
  Landmark,
  LineChart,
  Coins,
  HardHat,
  Building2,
  TrendingDown,
  ArrowRightLeft,
  FileWarning,
  Truck,
  Package,
};

export function CalculatorIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Calculator;
  return <Icon {...props} />;
}

export default CalculatorIcon;
