/* eslint-disable no-console */
import { decodeFunctionData, formatUnits, isAddress } from 'viem';

import { SMART_MARGIN_ACCOUNT_ABI } from './abi';
import { initClients } from './config';
import { getExecuteArguments } from './utils/helpers';
import { checkDelegate, getWalletInfo } from './utils/prepare';
import { getConditionalOrders } from './utils/prepare/get-conditional-orders';
import {
	modifyExecuteData,
	packExecuteData,
	parseExecuteData,
	parseOperationDetails,
} from './utils/trade';

const { publicClient, walletClient } = initClients();

async function main() {
	const { target: targetWallet, repeater: repeaterWallet } = getExecuteArguments();

	if (!targetWallet) {
		throw new Error('TARGET_SMART_ADDRESS is not set');
	}

	if (!isAddress(targetWallet)) {
		throw new Error('TARGET_SMART_ADDRESS is not a valid address');
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

	let { positions: targetPositions, totalBalance: targetTotalBalance } = await getWalletInfo({
		address: targetWallet,
		// Target can use own sUSD balance, so we need to include it in the total balance
		withOwnerBalance: true,
	});
	let targetConditionalOrders = await getConditionalOrders(targetWallet);

	let { totalBalance: repeaterTotalBalance } = await getWalletInfo({
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

					if (to?.toLowerCase() === targetWallet.toLowerCase()) {
						console.log('Transaction to target account found');

						const { args, functionName } = decodeFunctionData({
							abi: SMART_MARGIN_ACCOUNT_ABI,
							data: input,
						});

						try {
							if (functionName === 'execute') {
								const operations = parseExecuteData(args);
								const operationDetails = await parseOperationDetails(
									operations,
									targetPositions,
									targetConditionalOrders,
									targetWallet,
									targetTotalBalance,
									repeaterTotalBalance
								);

								const modifiedOperations = await modifyExecuteData({
									operationDetails,
									operations,
									address: repeaterWallet,
								});

								if (modifiedOperations.length === 0) {
									console.log('Operations list is empty. Skip this transaction');
									continue;
								}

								const packed = packExecuteData(modifiedOperations);

								const tx = await walletClient.sendTransaction({
									to: repeaterWallet,
									data: packed,
								});
							}
						} catch (e) {
							console.error(e);
						} finally {
							targetConditionalOrders = await getConditionalOrders(targetWallet);
							const updatedTarget = await getWalletInfo({
								address: targetWallet,
								// Target can use own sUSD balance, so we need to include it in the total balance
								withOwnerBalance: true,
							});

							targetPositions = updatedTarget.positions;
							targetTotalBalance = updatedTarget.totalBalance;

							const updatedRepeater = await getWalletInfo({
								address: repeaterWallet,
								// Delegate can't use owner sUSD balance, so we don't need to include it in the total balance
								withOwnerBalance: false,
							});

							repeaterTotalBalance = updatedRepeater.totalBalance;
						}
					}
				} catch (e) {
					continue;
				}
			}
		},
		pollingInterval: 999,
	});
}

main();
