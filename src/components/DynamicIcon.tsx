import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

interface DynamicIconProps extends LucideProps {
  name: string;
}

/**
 * Renders a Lucide icon dynamically by name.
 * Falls back to a generic icon if the name is not found.
 * 
 * Usage:
 * <DynamicIcon name="Mail" className="w-5 h-5" />
 */
export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  // Get the icon component from lucide-react
  const icons = LucideIcons as unknown as Record<string, ComponentType<LucideProps>>;
  const IconComponent = icons[name];

  // Fallback to CircleDot if icon not found
  if (!IconComponent) {
    return <LucideIcons.CircleDot {...props} />;
  }

  return <IconComponent {...props} />;
}
