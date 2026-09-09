export interface KosmosUser {
  id: string;
  privyUserId: string;
  email: string;
  linkedWallet: string | null;
  ensSubname: string | null;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  createdAt: string;
}

export interface KosmosEvent {
  id: string;
  hostId: string;
  name: string;
  description: string | null;
  location: string | null;
  coverImageCid: string | null;
  startsAt: string;
  endsAt: string;
  price: string;
  capacity: number | null;
  requiresApproval: boolean;
  escrowContractAddress: string | null;
  status: "draft" | "upcoming" | "live" | "ended" | "cancelled";
  createdAt: string;
}
