/* eslint-disable no-console */
import { decodeFunctionData, formatUnits, isAddress } from 'viem';

import { SMART_MARGIN_ACCOUNT_ABI } from './abi';
import { initClients } from './config';
import { checkDelegate, getSmartAccounts, getWalletInfo } from './utils/prepare';
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

	// TODO: Handle multiple accounts, not just the first one
	const targetAccounts = await getSmartAccounts(targetWallet);
	if (targetAccounts.length === 0) {
		console.error('Target KWENTA accounts not found');
		return;
	}

	const targetAccount = targetAccounts.at(0)!;

	const { positions: targetPositions, totalBalance: targetTotalBalance } = await getWalletInfo({
		address: targetAccount,
		// Target can use own sUSD balance, so we need to include it in the total balance
		withOwnerBalance: true,
	});

	const { positions: repeaterPositions, totalBalance: repeaterTotalBalance } = await getWalletInfo({
		address: repeaterWallet,
		// Delegate can't use owner sUSD balance, so we don't need to include it in the total balance
		withOwnerBalance: false,
	});

	console.log(`Available balance: ${formatUnits(repeaterTotalBalance, 18)} sUSD`);

	publicClient.watchBlocks({
		onBlock: async (block) => {
			for (const transaction of block.transactions) {
				try {
					const { to, input } =
						typeof transaction === 'string'
							? await publicClient.getTransaction({ hash: transaction })
							: transaction;

					if (to?.toLowerCase() === targetAccount.toLowerCase()) {
						console.log('Transaction to target account found');

						const { args, functionName } = decodeFunctionData({
							abi: SMART_MARGIN_ACCOUNT_ABI,
							data: input,
						});

						if (functionName === 'execute') {
							const operations = parseExecuteData(args);
							const operationDetails = await parseOperationDetails(
								operations,
								targetPositions,
								targetAccount,
								targetTotalBalance
							);
							console.log({ operationDetails });
						}
					}
				} catch (e) {
					console.error(e);
					continue;
				}
			}
		},
		pollingInterval: 999,
	});
}

main();
