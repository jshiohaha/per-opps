export const escapeMarkdownV2 = (text: string): string =>
    text.replace(/([_~`>#+\-=|.!])/g, "\\$1");
