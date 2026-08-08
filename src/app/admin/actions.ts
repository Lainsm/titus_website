"use server";

import { redirect } from "next/navigation";
import {
  clearAttempts,
  createSession,
  destroySession,
  recordAttempt,
  tooManyAttempts,
  verifyPassword,
} from "@/lib/auth";
import { queryOne } from "@/lib/db";
import type { SignInState } from "@/lib/form-states";


export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your e-mail address and password." };
  }

  if (await tooManyAttempts(email)) {
    return {
      error: "Too many attempts. Please wait 15 minutes and try again.",
    };
  }

  const user = await queryOne<{ id: number; password_hash: string }>(
    `SELECT id, password_hash FROM users WHERE email = $1`,
    [email],
  );

  // Always record the attempt and always run a comparison, so a missing
  // account and a wrong password take the same time and give the same answer.
  await recordAttempt(email);

  const valid = user
    ? await verifyPassword(password, user.password_hash)
    : await verifyPassword(password, "scrypt$00$00");

  if (!user || !valid) {
    return { error: "E-mail address or password is not correct." };
  }

  await clearAttempts(email);
  await createSession(user.id);

  // redirect() throws a control-flow signal — it must not sit inside a try.
  redirect("/admin");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
