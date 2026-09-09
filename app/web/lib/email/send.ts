import "server-only";
import { Resend } from "resend";
import type { ReactElement } from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
}

/// The one function every other commit calls to send an email — nothing
/// else in the codebase should import `resend` directly.
export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject,
    react,
  });

  if (error) {
    console.error("Failed to send email", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
