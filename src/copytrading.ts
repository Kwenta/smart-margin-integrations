/* eslint-disable no-console */
import type { Address, Hex } from 'viem';
import { decodeFunctionData, isAddress } from 'viem';

import { SMART_MARGIN_ACCOUNT_ABI, SMART_MARGIN_FACTORY_ABI } from './abi';
import { initClients } from './config';
import { SMART_MARGIN_FACTORY } from './constants/address';
import { parseExecuteData } from './utils';

const { publicClient } = initClients();

async function main() {
	const targetWallet = process.env.TARGET_WALLET;
	const chainId = process.env.CHAIN_ID!;

	if (!targetWallet) {
		throw new Error('TARGET_WALLET is not set');
	}

	if (!isAddress(targetWallet)) {
		throw new Error('TARGET_WALLET is not a valid address');
	}

	// TODO: Add check for delegate (walletClient must be as delegate)

	const targetAccounts = await publicClient.readContract({
		abi: SMART_MARGIN_FACTORY_ABI,
		address: SMART_MARGIN_FACTORY[chainId],
		functionName: 'getAccountsOwnedBy',
		args: [targetWallet],
	});

	if (targetAccounts.length === 0) {
		console.error('Target KWENTA accounts not found');
		return;
	}

	const formattedTargetAccounts = targetAccounts.map((account) => account.toLowerCase());

	publicClient.watchBlocks({
		onBlock: async (block) => {
			if (block.transactions.length === 0) {
				return;
			}

			for (const transaction of block.transactions) {
				try {
					let to: Address | null;
					let from: Address | null;
					let input: Hex;
					if (typeof transaction === 'string') {
						const {
							to: to_,
							from: from_,
							input: input_,
						} = await publicClient.getTransaction({
							hash: transaction,
						});
						to = to_;
						from = from_;
						input = input_;
					} else {
						const { to: to_, from: from_, input: input_ } = transaction;
						to = to_;
						from = from_;
						input = input_;
					}

					if (formattedTargetAccounts.includes(to!.toLowerCase())) {
						console.log('Transaction to target account found');

						const { args, functionName } = decodeFunctionData({
							abi: SMART_MARGIN_ACCOUNT_ABI,
							data: input,
						});

						if (functionName === 'execute') {
							parseExecuteData(args);
						}
					}
				} catch (e) {
					continue;
				}
			}
		},
		pollingInterval: 1500,
	});
}

main();
