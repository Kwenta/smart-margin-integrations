/* eslint-disable no-console */
import { decodeFunctionData, formatUnits, isAddress } from 'viem';

import { SMART_MARGIN_ACCOUNT_ABI } from './abi';
import { initClients } from './config';
import { checkDelegate, getIdleMargin, getSmartAccounts } from './utils/prepare';
import { getPositions } from './utils/prepare/get-positions';
import { parseExecuteData, parseOperationDetails } from './utils/trade';

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
	const formattedTargetAccounts = targetAccounts.map((account) => account.toLowerCase());

	if (targetAccounts.length === 0) {
		console.error('Target KWENTA accounts not found');
		return;
	}

	const targetPositionsResponse = await Promise.all(
		targetAccounts.map(async (account) => {
			return getPositions(account);
		})
	);
	const targetPositions = targetPositionsResponse
		.flat()
		.filter((position) => position.position.size !== 0n);
	const repeaterPositions = await getPositions(repeaterWallet);

	const repeaterBalance = await publicClient.readContract({
		abi: SMART_MARGIN_ACCOUNT_ABI,
		address: repeaterWallet,
		functionName: 'freeMargin',
	});

	const { idleInMarkets } = await getIdleMargin(repeaterWallet);

	const totalBalance = idleInMarkets + repeaterBalance;
	const totalBalanceInUSD = formatUnits(totalBalance, 18);
	console.log(`Available balance: ${totalBalanceInUSD} sUSD`);

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
							const operations = parseExecuteData(args);
							const operationDetails = parseOperationDetails(operations, targetPositions);
							console.log({ operationDetails });
							// try {
							// 	// TODO: Add sUSD approve check here
							// 	console.log('Sending transaction to repeater wallet');
							// 	const hash = await walletClient.sendTransaction({
							// 		to: repeaterWallet,
							// 		data: input,
							// 		gas: (gas * 110n) / 100n,
							// 	});
							// 	console.log('Transaction sent', hash);
							// 	await publicClient.waitForTransactionReceipt({ hash });
							// } catch (e) {
							// 	console.error(e);
							// }
						}
					}
				} catch (e) {
					console.error(e);
					continue;
				}
			}
		},
		pollingInterval: 1500,
	});
}

main();
