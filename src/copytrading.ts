/* eslint-disable no-console */
import { decodeFunctionData, isAddress } from 'viem';

import { SMART_MARGIN_ACCOUNT_ABI } from './abi';
import { initClients } from './config';
import { checkDelegate, getSmartAccounts, parseExecuteData } from './utils';

const { publicClient, walletClient } = initClients();

async function main() {
	const targetWallet = process.env.TARGET_WALLET;
	const repeaterWallet = process.env.REPEATER_SMART_ADDRESS;

	if (!targetWallet) {
		throw new Error('TARGET_WALLET is not set');
	}

	if (!isAddress(targetWallet)) {
		throw new Error('TARGET_WALLET is not a valid address');
	}

	if (!repeaterWallet) {
		throw new Error('REPEATER_SMART_ADDRESS is not set');
	}

	if (!isAddress(repeaterWallet)) {
		throw new Error('REPEATER_SMART_ADDRESS is not a valid address');
	}

	const hasDelegate = await checkDelegate({ repeaterWallet });

	if (!hasDelegate) {
		console.error('Executor wallet must be a delegate for the repeater wallet');
		return;
	}

	const targetAccounts = await getSmartAccounts(targetWallet);

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
					const { to, input, gas } =
						typeof transaction === 'string'
							? await publicClient.getTransaction({ hash: transaction })
							: transaction;

					if (formattedTargetAccounts.includes(to!.toLowerCase())) {
						console.log('Transaction to target account found');

						const { args, functionName } = decodeFunctionData({
							abi: SMART_MARGIN_ACCOUNT_ABI,
							data: input,
						});

						if (functionName === 'execute') {
							parseExecuteData(args);

							try {
								// TODO: Add sUSD approve check here
								console.log('Sending transaction to repeater wallet');
								const hash = await walletClient.sendTransaction({
									to: repeaterWallet,
									data: input,
									gas: (gas * 110n) / 100n,
								});
								console.log('Transaction sent', hash);
								await publicClient.waitForTransactionReceipt({ hash });
							} catch (e) {
								console.error(e);
							}
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
