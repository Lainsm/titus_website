/**
 * Shapes and starting values for every `useActionState` form.
 *
 * These live outside the `"use server"` files on purpose: such a file may only
 * export async functions, so a plain constant declared next to its action
 * breaks the build.
 */

export type SignInState = { error: string };
export const initialSignInState: SignInState = { error: "" };

export type SubscribeState = {
  status: "idle" | "success" | "error" | "already";
  message: string;
};
export const initialSubscribeState: SubscribeState = {
  status: "idle",
  message: "",
};

export type ContactState = {
  status: "idle" | "success" | "error";
  message: string;
  /** Which field the error belongs to, so the form can mark it invalid. */
  field?: "name" | "email" | "message";
};
export const initialContactState: ContactState = {
  status: "idle",
  message: "",
};

export type PostFormState = { error: string; message: string };
export const initialPostFormState: PostFormState = { error: "", message: "" };

export type PageFormState = { error: string; message: string };
export const initialPageFormState: PageFormState = { error: "", message: "" };

export type NewsletterFormState = { error: string; message: string };
export const initialNewsletterFormState: NewsletterFormState = {
  error: "",
  message: "",
};

export type SendState = {
  error: string;
  message: string;
  sent: number;
  failed: number;
  remaining: number;
  done: boolean;
};
export const initialSendState: SendState = {
  error: "",
  message: "",
  sent: 0,
  failed: 0,
  remaining: 0,
  done: false,
};
