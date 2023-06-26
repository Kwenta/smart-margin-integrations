import { type Address } from 'viem';

import { PERPS_V2_MARKET_DATA_ABI } from '../../abi';
import { initClients } from '../../config';
import { PERPS_V2_MARKET_DATA } from '../../constants/address';

interface PositionDetail {
	remainingMargin: bigint;
	accessibleMargin: bigint;
	orderPending: boolean;
	order: {
		pending: boolean;
		fee: bigint;
		leverage: bigint;
	};
	position: {
		fundingIndex: bigint;
		lastPrice: bigint;
		size: bigint;
		margin: bigint;
	};
	accruedFunding: bigint;
	notionalValue: bigint;
	liquidationPrice: bigint;
	profitLoss: bigint;
}

interface IdlePosition {
	market: string;
	idleMargin: bigint;
}

// TODO: Use SDK to get margin from markets
async function getIdleMargin(repeaterWallet: Address) {
	const { publicClient } = initClients();
	const chainId = publicClient.chain.id;

	const config = {
		abi: PERPS_V2_MARKET_DATA_ABI,
		functionName: 'positionDetailsForMarketKey',
		address: PERPS_V2_MARKET_DATA[chainId],
	};

	const allMarketsResponse = await publicClient.readContract({
		abi: PERPS_V2_MARKET_DATA_ABI,
		address: PERPS_V2_MARKET_DATA[chainId],
		functionName: 'allProxiedMarketSummaries',
	});

	const marketKeys = allMarketsResponse.map(({ key }) => key);

	const positionsResponse = await publicClient.multicall({
		contracts: marketKeys.map((key) => ({
			...config,
			args: [key, repeaterWallet],
		})),
	});

	const allMarkets = allMarketsResponse.map(({ key, market }) => ({
		key,
		market,
	}));

	const positions = positionsResponse
		.filter((position) => position.status === 'success')
		.map((position, idx) => ({
			...(position.result as PositionDetail),
			key: marketKeys[idx],
			market: allMarkets.find((market) => market.key === marketKeys[idx])!,
		}));

	const positionsWithIdleMargin = positions.filter(
		(p) => p.position?.size === 0n && p.remainingMargin > 0n
	);

	const idleInMarkets = positionsWithIdleMargin.reduce((acc, p) => acc + p.remainingMargin, 0n);

	return {
		idleInMarkets,
		positions: positionsWithIdleMargin.map(
			(position): IdlePosition => ({
				market: position.market.market,
				idleMargin: position.remainingMargin,
			})
		),
	};
}

export { getIdleMargin };
export type { IdlePosition };
