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
};

export function CalculatorIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Calculator;
  return <Icon {...props} />;
}

export default CalculatorIcon;
