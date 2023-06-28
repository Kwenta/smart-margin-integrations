import { providers } from 'ethers';
import type { PublicClient } from 'viem';

function publicClientToProvider(publicClient: PublicClient) {
	const { chain, transport } = publicClient;

	if (!chain) {
		throw new Error('Missing chain');
	}

	const network = {
		chainId: chain.id,
		name: chain.name,
		ensAddress: chain.contracts?.ensRegistry?.address,
	};

	return new providers.JsonRpcProvider(transport.url, network);
}

export { publicClientToProvider };
