"use client";

import { useEffect, useState } from "react";
import AuthModal from "./AuthModal";
import { useAuth } from "./AuthProvider";
import { setAuthModalOpener } from "./AuthProvider";

export const AuthModalHost = () => {
  const { refreshAuth } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setAuthModalOpener(() => () => setIsOpen(true));
    return () => setAuthModalOpener(null);
  }, []);

  return (
    <AuthModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onAuthenticated={refreshAuth}
    />
  );
};