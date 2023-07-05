import { type Address, isAddressEqual } from 'viem';

import { SMART_MARGIN_ACCOUNT_ABI } from '../../abi';
import { initClients } from '../../config';

interface CheckDelegateOptions {
	repeaterWallet: Address;
}

async function checkDelegate({ repeaterWallet }: CheckDelegateOptions): Promise<boolean> {
	const { publicClient, walletClient } = initClients();
	const executorAddress = walletClient.account.address;

	// It can be delegate or owner, check both
	const contract = {
		address: repeaterWallet,
		abi: SMART_MARGIN_ACCOUNT_ABI,
	};

	const [hasDelegateResponse, ownerResponse] = await publicClient.multicall({
		contracts: [
			{
				...contract,
				functionName: 'delegates',
				args: [executorAddress],
			},
			{
				...contract,
				functionName: 'owner',
			},
		],
	});

	const isOwner = ownerResponse.result && isAddressEqual(ownerResponse.result, executorAddress);
	const isDelegate = !!hasDelegateResponse.result;

	return isOwner || isDelegate;
}

export { checkDelegate };
