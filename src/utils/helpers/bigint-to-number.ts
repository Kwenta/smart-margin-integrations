import { formatUnits } from 'viem';

function bigintToNumber(value: bigint, decimals = 18) {
	return Number.parseFloat(formatUnits(value, decimals));
}

export { bigintToNumber };
