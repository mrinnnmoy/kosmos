import { Text } from "@react-email/components";
import { EmailLayout } from "./components/EmailLayout";

interface ReminderEmailProps {
  attendeeName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
}

export default function ReminderEmail({
  attendeeName,
  eventName,
  eventDate,
  eventLocation,
}: ReminderEmailProps) {
  return (
    <EmailLayout>
      <Text style={{ fontSize: 16 }}>Hi {attendeeName},</Text>
      <Text style={{ fontSize: 16 }}>
        Quick reminder — <strong>{eventName}</strong> is happening in about 24
        hours.
      </Text>
      <Text style={{ fontSize: 14, color: "#8e8e93" }}>
        {eventDate} · {eventLocation}
      </Text>
      <Text style={{ fontSize: 16, marginTop: 16 }}>
        Don&apos;t forget to bring your ticket QR code — no check-in means no
        payout to the host and no NFT for you.
      </Text>
    </EmailLayout>
  );
}
