import "server-only";
import { PinataSDK } from "pinata";

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.PINATA_GATEWAY ?? "gateway.pinata.cloud",
});

export async function uploadToIPFS(file: File): Promise<string> {
  const upload = await pinata.upload.public.file(file);
  return upload.cid;
}

export function ipfsUrl(cid: string): string {
  return `https://${process.env.PINATA_GATEWAY ?? "gateway.pinata.cloud"}/ipfs/${cid}`;
}
