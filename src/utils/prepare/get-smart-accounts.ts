import dotenv from 'dotenv';
import type { Address } from 'viem';

import { SMART_MARGIN_FACTORY_ABI } from '../../abi';
import { initClients } from '../../config';
import { SMART_MARGIN_FACTORY } from '../../constants/address';

dotenv.config();

async function getSmartAccounts(address: Address) {
	const { publicClient } = initClients();
	const chainId = process.env.CHAIN_ID!;

	const targetAccounts = await publicClient.readContract({
		abi: SMART_MARGIN_FACTORY_ABI,
		address: SMART_MARGIN_FACTORY[chainId],
		functionName: 'getAccountsOwnedBy',
		args: [address],
	});

	return targetAccounts;
}

export { getSmartAccounts };
