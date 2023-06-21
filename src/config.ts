import dotenv from 'dotenv';
import { createPublicClient, createWalletClient, http, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { optimism, optimismGoerli } from 'viem/chains';

dotenv.config();

const supportedChains = ['10', '420'];

function initClients() {
	const chainId = process.env.CHAIN_ID;
	const privateKey = process.env.EXECUTOR_PRIVATE_KEY;
	const rpcUrl = process.env.JSON_RPC_URL;

	if (!chainId) {
		throw new Error('Missing env var CHAIN_ID');
	}

	if (!rpcUrl) {
		throw new Error('Missing env var RPC_URL');
	}

	if (!supportedChains.includes(chainId)) {
		throw new Error(`Unsupported chain id: ${chainId}`);
	}

	if (!privateKey) {
		throw new Error('Missing env var EXECUTOR_PRIVATE_KEY');
	}

	if (!isAddress(privateKey)) {
		throw new Error('Invalid private key');
	}

	return {
		publicClient: createPublicClient({
			transport: http(rpcUrl),
			chain: chainId === '10' ? optimism : optimismGoerli,
		}),
		walletClient: createWalletClient({
			transport: http(rpcUrl),
			chain: chainId === '10' ? optimism : optimismGoerli,
			account: privateKeyToAccount(privateKey),
		}),
	};
}

export { initClients };
