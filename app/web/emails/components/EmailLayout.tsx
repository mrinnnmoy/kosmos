import { Html, Head, Body, Container, Text, Hr } from "@react-email/components";
import type { ReactNode } from "react";

export function EmailLayout({ children }: { children: ReactNode }) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f4f4f6", fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 12,
            padding: 32,
            maxWidth: 480,
            margin: "40px auto",
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: 700, color: "#1463FF", margin: 0 }}>
            Kosmos
          </Text>
          <Hr style={{ margin: "20px 0", borderColor: "#e5e5ea" }} />
          {children}
          <Hr style={{ margin: "20px 0", borderColor: "#e5e5ea" }} />
          <Text style={{ fontSize: 12, color: "#8e8e93" }}>
            Kosmos — tickets backed by escrow, not promises.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
