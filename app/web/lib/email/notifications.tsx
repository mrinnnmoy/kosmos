import "server-only";
import QRCode from "qrcode";
import { sendEmail } from "./send";
import PaymentConfirmationEmail from "@/emails/PaymentConfirmationEmail";
import QRTicketEmail from "@/emails/QRTicketEmail";
import ReminderEmail from "@/emails/ReminderEmail";

export async function sendPaymentConfirmationEmail(params: {
  to: string;
  attendeeName: string;
  eventName: string;
  eventDate: string;
  amount: string;
  dashboardUrl: string;
}) {
  const { to, ...props } = params;
  return sendEmail({
    to,
    subject: `Payment received for ${props.eventName}`,
    react: <PaymentConfirmationEmail {...props} />,
  });
}

export async function sendQRTicketEmail(params: {
  to: string;
  attendeeName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  ticketId: string;
}) {
  const { to, ticketId, ...rest } = params;
  const qrCodeDataUrl = await QRCode.toDataURL(ticketId);

  return sendEmail({
    to,
    subject: `You're in! Ticket for ${rest.eventName}`,
    react: <QRTicketEmail {...rest} qrCodeDataUrl={qrCodeDataUrl} />,
  });
}

export async function sendReminderEmail(params: {
  to: string;
  attendeeName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
}) {
  const { to, ...props } = params;
  return sendEmail({
    to,
    subject: `Reminder: ${props.eventName} is tomorrow`,
    react: <ReminderEmail {...props} />,
  });
}
