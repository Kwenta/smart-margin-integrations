import { type Address } from 'viem';

import { getPositions } from './get-positions';

interface IdlePosition {
	market: string;
	idleMargin: bigint;
}

// TODO: Use SDK to get margin from markets
async function getIdleMargin(repeaterWallet: Address) {
	const positions = await getPositions(repeaterWallet);

	const positionsWithIdleMargin = positions.filter(
		(p) => p.position?.size === 0n && p.remainingMargin > 0n
	);

	const idleInMarkets = positionsWithIdleMargin.reduce((acc, p) => acc + p.remainingMargin, 0n);

	return {
		idleInMarkets,
		positions: positionsWithIdleMargin.map((position) => ({
			market: position.market.market,
			idleMargin: position.remainingMargin,
		})),
	};
}

export { getIdleMargin };
export type { IdlePosition };