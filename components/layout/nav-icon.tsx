import {
  Activity,
  Bell,
  BookOpen,
  Circle,
  Clock,
  FileSearch,
  FlaskConical,
  Gauge,
  Home,
  LayoutGrid,
  Map,
  Package,
  PhoneCall,
  PlusCircle,
  ReceiptText,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * An explicit map of the icons the navigation uses.
 *
 * `import * as Icons from "lucide-react"` looks convenient but defeats
 * tree-shaking and ships the entire icon library — over a thousand icons — to
 * a low-end phone to render nineteen of them.
 */
const ICONS: Record<string, LucideIcon> = {
  Activity,
  Bell,
  BookOpen,
  Clock,
  FileSearch,
  FlaskConical,
  Gauge,
  Home,
  LayoutGrid,
  Map,
  Package,
  PhoneCall,
  PlusCircle,
  ReceiptText,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Users,
  Zap,
};

export function NavIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? Circle;
  return <Icon size={size} strokeWidth={1.8} aria-hidden />;
}
