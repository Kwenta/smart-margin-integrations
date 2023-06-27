import type { Address, ReadContractReturnType } from 'viem';

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

let allMarkets: ReadContractReturnType<
	typeof PERPS_V2_MARKET_DATA_ABI,
	'allProxiedMarketSummaries'
>;

async function getPositions(wallet: Address) {
	const { publicClient } = initClients();
	const chainId = publicClient.chain.id;

	const config = {
		abi: PERPS_V2_MARKET_DATA_ABI,
		functionName: 'positionDetailsForMarketKey',
		address: PERPS_V2_MARKET_DATA[chainId],
	};

	if (!allMarkets) {
		allMarkets = await publicClient.readContract({
			abi: PERPS_V2_MARKET_DATA_ABI,
			address: PERPS_V2_MARKET_DATA[chainId],
			functionName: 'allProxiedMarketSummaries',
		});
	}
	const marketKeys = allMarkets.map(({ key }) => key);

	const positionsResponse = await publicClient.multicall({
		contracts: marketKeys.map((key) => ({
			...config,
			args: [key, wallet],
		})),
	});

	const allMarketsFormatted = allMarkets.map(({ key, market }) => ({
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

	return positions;
}

export { getPositions };
export type { PositionDetail };
