"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

export default function StyleGuidePage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-12">
        <header>
          <p className="text-sm font-medium text-primary"> Kosmos UI </p>
          <h1 className="mt-2 font-heading text-4xl font-bold">Style Guide</h1>
          <p className="mt-3 text-muted-foreground">
            Temporary page for testing the core UI component library.
          </p>
        </header>
        <section className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary"> Secondary </Button>
            <Button variant="ghost"> Ghost </Button>
            <Button variant="danger"> Danger </Button>
          </div>
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold">Form Controls</h2>
          <div className="max-w-md space-y-4">
            <Input placeholder="Event name" />
            <Select defaultValue="">
              <option value="" disabled>
                Select category
              </option>
              <option value="music"> Music </option>
              <option value="sports"> Sports </option>
              <option value="conference"> Conference </option>
            </Select>
          </div>
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold"> Badges </h2>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge> <Badge tone="success"> Success </Badge>
            <Badge tone="danger"> Danger </Badge>
            <Badge tone="warning"> Warning </Badge>
          </div>
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold"> Card </h2>
          <Card>
            <h3 className="font-heading text-xl font-semibold">
              Example Event
            </h3>
            <p className="mt-2 text-muted-foreground">
              A reusable Kosmos card component.
            </p>
          </Card>
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold"> Modal </h2>
          <Button onClick={() => setModalOpen(true)}> Open Modal </Button>
          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title="Example Modal"
          >
            <p className="text-muted-foreground">
              This is the Kosmos modal component.
            </p>
          </Modal>
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold"> Toast </h2>
          <Button onClick={() => toast.success("Joined!")}>
            Test Success Toast
          </Button>
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-2xl font-semibold">
            Brand Gradient
          </h2>
          <div className="h-24 rounded-xl bg-brand-gradient" />
        </section>
      </div>
    </main>
  );
}
