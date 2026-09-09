import { Text, Button, Section } from "@react-email/components";
import { EmailLayout } from "./components/EmailLayout";

interface PaymentConfirmationEmailProps {
  attendeeName: string;
  eventName: string;
  eventDate: string;
  amount: string;
  dashboardUrl: string;
}

export default function PaymentConfirmationEmail({
  attendeeName,
  eventName,
  eventDate,
  amount,
  dashboardUrl,
}: PaymentConfirmationEmailProps) {
  return (
    <EmailLayout>
      <Text style={{ fontSize: 16 }}>Hi {attendeeName},</Text>
      <Text style={{ fontSize: 16 }}>
        We&apos;ve received your payment of <strong>{amount}</strong> for{" "}
        <strong>{eventName}</strong> on {eventDate}. It&apos;s held in escrow
        until the host reviews your request.
      </Text>
      <Text style={{ fontSize: 16 }}>
        You&apos;ll get another email the moment you&apos;re approved — with
        your ticket QR code attached.
      </Text>
      <Section style={{ marginTop: 24 }}>
        <Button
          href={dashboardUrl}
          style={{
            backgroundColor: "#1463FF",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          View your dashboard
        </Button>
      </Section>
    </EmailLayout>
  );
}
