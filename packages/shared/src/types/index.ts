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
  name: string;
  // Extended in Commit 13 when event creation actually exists
}
