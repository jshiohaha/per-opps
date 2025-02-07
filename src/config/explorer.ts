export type ExplorerProvider = "solana-explorer" | "solscan" | "solana-fm";

export const EXPLORER_URL_PROVIDER: Record<
    ExplorerProvider,
    Record<string, string>
> = {
    ["solana-explorer"]: {
        address: "https://explorer.solana.com/address",
        tx: "https://explorer.solana.com/tx",
    },
    ["solscan"]: {
        address: "https://solscan.io/account",
        tx: "https://solscan.io/tx",
    },
    ["solana-fm"]: {
        address: "https://solana.fm/address",
        tx: "https://solana-fm.com/tx",
    },
};
