import { createPublicClient, createWalletClient, http } from 'viem';
import dotenv from 'dotenv';
import { optimism, optimismGoerli } from 'viem/chains';

dotenv.config();

const supportedChains = ['10', '420'];

const initClients = () => {
	const chainId = process.env.CHAIN_ID;
	const wsUrl = process.env.WS_URL;
	const rpcUrl = process.env.JSON_RPC_URL;

	if (!chainId) {
		throw new Error('Missing env var CHAIN_ID');
	}

	// if (!wsUrl) {
	// 	throw new Error('Missing env var WS_URL');
	// }

	if (!rpcUrl) {
		throw new Error('Missing env var RPC_URL');
	}

	if (!supportedChains.includes(chainId)) {
		throw new Error(`Unsupported chain id: ${chainId}`);
	}

	return {
		// wsClient: createPublicClient({
		// 	transport: webSocket(wsUrl),
		// 	chain: chainId === '10' ? optimism : optimismGoerli,
		// }),
		publicClient: createPublicClient({
			transport: http(rpcUrl),
			chain: chainId === '10' ? optimism : optimismGoerli,
		}),
		walletClient: createWalletClient({
			transport: http(wsUrl),
			chain: chainId === '10' ? optimism : optimismGoerli,
		}),
	};
};

export { initClients };
