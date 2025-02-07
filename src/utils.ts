import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export const setupSearcher = (pk: string): Keypair =>
    Keypair.fromSecretKey(Uint8Array.from(bs58.decode(pk)));
