import { Text, Img, Section } from "@react-email/components";
import { EmailLayout } from "./components/EmailLayout";

interface QRTicketEmailProps {
  attendeeName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  qrCodeCid: string;
}

export default function QRTicketEmail({
  attendeeName,
  eventName,
  eventDate,
  eventLocation,
  qrCodeCid,
}: QRTicketEmailProps) {
  return (
    <EmailLayout>
      <Text style={{ fontSize: 16 }}>Hi {attendeeName},</Text>
      <Text style={{ fontSize: 16 }}>
        You&apos;re in! Your spot at <strong>{eventName}</strong> is confirmed.
      </Text>
      <Text style={{ fontSize: 14, color: "#8e8e93" }}>
        {eventDate} · {eventLocation}
      </Text>
      <Section style={{ textAlign: "center", marginTop: 24 }}>
        <Img
          src={`cid:${qrCodeCid}`}
          width={200}
          height={200}
          alt="Your ticket QR code"
        />
      </Section>
      <Text style={{ fontSize: 14, color: "#8e8e93", marginTop: 16 }}>
        Show this QR code at the door to check in.
      </Text>
    </EmailLayout>
  );
}
