import type { Hex } from 'viem';
import { decodeAbiParameters, parseAbiParameters } from 'viem';

const commands: Record<number, string> = {
	0: 'int256 amount',
	1: 'uint256 amount',
	2: 'address market, int256 amount',
	3: 'address market',
	4: 'address market, int256 sizeDelta, uint256 desiredFillPrice',
	5: 'address market, int256 sizeDelta, uint256 desiredTimeDelta, uint256 desiredFillPrice',
	6: 'address market, int256 sizeDelta, uint256 desiredFillPrice',
	7: 'address market, uint256 desiredFillPrice',
	8: 'address market, uint256 desiredTimeDelta, uint256 desiredFillPrice',
	9: 'address market, uint256 desiredFillPrice',
	10: 'address market',
	11: 'address market',
	12: 'bytes32 marketKey, int256 marginDelta, int256 sizeDelta, uint256 targetPrice, ConditionalOrderTypes conditionalOrderType, uint128 desiredFillPrice, bool reduceOnly',
	13: 'uint256 orderId',
};

const commandsToNames: Record<number, string> = {
	0: 'ACCOUNT_MODIFY_MARGIN',
	1: 'ACCOUNT_WITHDRAW_ETH',
	2: 'PERPS_V2_MODIFY_MARGIN',
	3: 'PERPS_V2_WITHDRAW_ALL_MARGIN',
	4: 'PERPS_V2_SUBMIT_ATOMIC_ORDER',
	5: 'PERPS_V2_SUBMIT_DELAYED_ORDER',
	6: 'PERPS_V2_SUBMIT_OFFCHAIN_DELAYED_ORDER',
	7: 'PERPS_V2_CLOSE_POSITION',
	8: 'PERPS_V2_SUBMIT_CLOSE_DELAYED_ORDER',
	9: 'PERPS_V2_SUBMIT_CLOSE_OFFCHAIN_DELAYED_ORDER',
	10: 'PERPS_V2_CANCEL_DELAYED_ORDER',
	11: 'PERPS_V2_CANCEL_OFFCHAIN_DELAYED_ORDER',
	12: 'GELATO_PLACE_CONDITIONAL_ORDER',
	13: 'GELATO_CANCEL_CONDITIONAL_ORDER',
};

function parseExecuteData(data: readonly [readonly number[], readonly Hex[]]) {
	for (let i = 0; i < data.at(0)!.length; i++) {
		const command = data[0][i];
		const args = data[1][i];

		const commandName = commandsToNames[command];
		const commandArgs = commands[command];
		const decodedArgs = decodeAbiParameters(parseAbiParameters(commandArgs), args);

		// eslint-disable-next-line no-console
		console.log(commandName, decodedArgs);
	}
}

export { parseExecuteData };
