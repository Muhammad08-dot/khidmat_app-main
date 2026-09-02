import React from "react";
import { View } from "react-native";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Base surface card. The web version had a mouse-tilt (desktop only) that has
 * no mobile equivalent, so this is a clean elevated surface container.
 */
export const Card: React.FC<CardProps> = ({ children, className = "" }) => {
  return (
    <View
      className={`w-full rounded-2xl border border-border bg-surface-raised p-6 shadow-soft ${className}`}
    >
      {children}
    </View>
  );
};
