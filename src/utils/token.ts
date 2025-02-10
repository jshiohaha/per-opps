import { DigitalAsset } from "@metaplex-foundation/mpl-token-metadata";

import { logger } from "../logger";

export const formatTokenAmount = (
    amount: number | bigint,
    decimals: number
): string => {
    const amountBigInt = BigInt(amount);
    const divisor = BigInt(10) ** BigInt(decimals);

    const wholePart = amountBigInt / divisor;
    const fractionalPart = amountBigInt % divisor;

    const formattedFractionalAmount = fractionalPart
        .toString()
        .padStart(decimals, "0");

    const formattedAmount = `${wholePart}${
        fractionalPart ? `.${formattedFractionalAmount}` : ""
    }`;

    logger.info(
        `formatTokenAmount = ${JSON.stringify({
            amount: BigInt(amount).toString(),
            decimals,
            formattedAmount,
        })}`
    );

    return formattedAmount;
};

export const serializeDigitalAsset = (asset: DigitalAsset | null) =>
    !asset
        ? undefined
        : JSON.stringify(
              asset,
              (_, value) =>
                  typeof value === "bigint" ? value.toString() : value,
              2
          );
