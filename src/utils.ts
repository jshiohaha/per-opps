import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

import { EXPLORER_URL_PROVIDER, ExplorerProvider } from "./config";

export const toKeypair = (encoded: string): Keypair =>
    Keypair.fromSecretKey(Uint8Array.from(bs58.decode(encoded)));

export const generateAddressLink = (
    pk: PublicKey,
    provider: ExplorerProvider = "solscan"
) => {
    return `${EXPLORER_URL_PROVIDER[provider].address}/${pk.toBase58()}`;
};

export const generateTxLink = (
    sig: string,
    provider: ExplorerProvider = "solscan"
) => {
    return `${EXPLORER_URL_PROVIDER[provider].tx}/${sig}`;
};

export const shortAddress = (address: PublicKey) =>
    `${address.toBase58().slice(0, 4)}...${address.toBase58().slice(-4)}`;
