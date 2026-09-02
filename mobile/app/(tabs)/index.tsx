import React from "react";
import { useAuth } from "../../src/contexts/AuthContext";
import { CustomerHome } from "../../src/components/features/CustomerHome";
import { ProviderHome } from "../../src/components/features/ProviderHome";

export default function HomeScreen() {
  const { userProfile } = useAuth();

  if (userProfile && userProfile.current_mode === "worker") {
    return <ProviderHome />;
  }

  return <CustomerHome />;
}
