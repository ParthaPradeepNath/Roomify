"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";
import Button from "./ui/Button";
import { ApiError, login, register } from "@/lib/api";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => unknown | Promise<unknown>;
};

const AuthModal = ({ isOpen, onClose, onAuthenticated }: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setError(null);
    setPassword("");
    setIsSubmitting(false);
  };
  const switchMode = (next: "login" | "register") => {
    setMode(next);
    reset();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "register") {
        if (password.length < 8) {
          setError("Password must be at least 8 characters long.");
          setIsSubmitting(false);
          return;
        }
        await register({ email, name, password });
      } else {
        await login({ email, password });
      }
      await onAuthenticated();
      setEmail("");
      setName("");
      reset();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-modal" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <h3>{mode === "login" ? "Welcome back" : "Create your account"}</h3>
        <p>
          {mode === "login"
            ? "Sign in to continue building with Roomify."
            : "Get started with Roomify in seconds."}
        </p>
        <form className="form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                autoComplete="name"
              />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>
        <p className="switch">
          {mode === "login" ? "New to Roomify?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => switchMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;