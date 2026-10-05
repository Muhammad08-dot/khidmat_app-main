import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";

interface AvatarProps {
  src?: string;
  name: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  className = "w-12 h-12",
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  if (src && src.trim() !== "" && !hasError) {
    return (
      <Image
        source={{ uri: src }}
        contentFit="cover"
        onError={() => setHasError(true)}
        className={`rounded-full border border-border ${className}`}
      />
    );
  }

  return (
    <View
      className={`items-center justify-center rounded-full border border-border bg-surface-raised ${className}`}
    >
      <Text className="font-sans text-xs font-bold tracking-wide text-primary">{initials}</Text>
    </View>
  );
};
