export const formatTokenAmount = (
    amount: number | bigint,
    decimals: number
): string => {
    const amountBigInt = BigInt(amount);
    const divisor = BigInt(10) ** BigInt(decimals);

    const wholePart = amountBigInt / divisor;
    const fractionalPart = amountBigInt % divisor;

    return `${wholePart}${fractionalPart ? `.${fractionalPart}` : ""}`;
};
