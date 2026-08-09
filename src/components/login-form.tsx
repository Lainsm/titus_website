"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signInAction } from "@/app/admin/actions";
import { initialSignInState } from "@/lib/form-states";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button" disabled={pending}>
      {pending ? "Signing in …" : "Sign in"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(signInAction, initialSignInState);

  return (
    <form action={formAction} className="login__form">
      {state.error && (
        <div className="notice notice--error" role="alert">
          {state.error}
        </div>
      )}

      <div className="field">
        <label htmlFor="email">E-mail address</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      <div className="login__actions">
        <SubmitButton />
      </div>
    </form>
  );
}
