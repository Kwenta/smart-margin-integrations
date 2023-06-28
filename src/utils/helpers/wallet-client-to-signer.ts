import { providers } from 'ethers';
import type { WalletClient } from 'viem';

function walletClientToSigner(client: WalletClient) {
	const { account, chain, transport } = client;

	if (!account) {
		throw new Error('Missing account');
	}

	if (!chain) {
		throw new Error('Missing chain');
	}

	const network = {
		chainId: chain.id,
		name: chain.name,
		ensAddress: chain.contracts?.ensRegistry?.address,
	};

	const provider = new providers.Web3Provider(transport, network);
	const signer = provider.getSigner(account.address);
	return signer;
}

export { walletClientToSigner };
