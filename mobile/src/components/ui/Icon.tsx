import React from "react";
import { LucideIcon } from "lucide-react-native";

/** Props a lucide icon accepts at runtime. Kept permissive to sidestep the
 *  strict SvgProps typing that trips on `color`/`size`. */
export interface IconProps {
  color?: string;
  size?: number | string;
  strokeWidth?: number | string;
}

/**
 * Renders a lucide icon with a props shape that TypeScript accepts, avoiding
 * repeated `as ComponentType<...>` casts throughout the app.
 */
export const Icon: React.FC<{ icon: LucideIcon } & IconProps> = ({
  icon: Lucide,
  color,
  size,
  strokeWidth,
}) => {
  const Cmp = Lucide as React.ComponentType<IconProps>;
  return <Cmp color={color} size={size} strokeWidth={strokeWidth} />;
};

export default Icon;
