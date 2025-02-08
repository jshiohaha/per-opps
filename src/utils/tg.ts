// https://core.telegram.org/bots/api#formatting-options
export const escapeMarkdownV2 = (text: string): string =>
    text.replace(/([_~`>#+\-=|.!])/g, "\\$1");
