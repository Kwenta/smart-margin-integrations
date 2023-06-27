import type { Address } from 'viem';

import { ERC20_ABI, SMART_MARGIN_ACCOUNT_ABI } from '../../abi';
import { initClients } from '../../config';
import { sUSD_SYNTH_ADDRESS } from '../../constants/address';

import { getIdleMargin } from './get-idle-margin';
import { getPositions } from './get-positions';

interface GetWalletInfoProps {
	address: Address;
	withOwnerBalance?: boolean;
}

async function getWalletInfo({ address, withOwnerBalance = false }: GetWalletInfoProps) {
	const { publicClient } = initClients();

	const positions = await getPositions(address);
	const balance = await publicClient.readContract({
		abi: SMART_MARGIN_ACCOUNT_ABI,
		address,
		functionName: 'freeMargin',
	});

	const idleMargin = await getIdleMargin(positions);
	const { idleInMarkets } = idleMargin;

	const owner = await publicClient.readContract({
		abi: SMART_MARGIN_ACCOUNT_ABI,
		address,
		functionName: 'owner',
	});

	const walletBalance = withOwnerBalance
		? await publicClient.readContract({
				abi: ERC20_ABI,
				address: sUSD_SYNTH_ADDRESS[publicClient.chain.id],
				functionName: 'balanceOf',
				args: [owner],
		  })
		: 0n;

	const totalBalance = walletBalance + balance + idleInMarkets;

	return {
		positions,
		idleMargin,
		totalBalance,
	};
}

export { getWalletInfo };
