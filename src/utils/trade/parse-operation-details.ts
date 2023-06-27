import type { Address } from 'viem';
import { isAddress } from 'viem';

import type { PositionDetail } from 'utils/prepare/get-positions';

import { commandsToNames } from '../../constants/commands';

import type { ExecuteOperation } from './parse-execute-data';

enum OperationType {
	OPEN_SHORT = 'OPEN_SHORT',
	OPEN_LONG = 'OPEN_LONG',
	CLOSE_SHORT = 'CLOSE_SHORT',
	CLOSE_LONG = 'CLOSE_LONG',
	INCREASE_MARGIN = 'INCREASE_MARGIN',
	DECREASE_MARGIN = 'DECREASE_MARGIN',
	INCREASE_SIZE = 'INCREASE_SIZE',
	DECREASE_SIZE = 'DECREASE_SIZE',
	PLACE_CONDITIONAL_ORDER = 'PLACE_CONDITIONAL_ORDER',
	CANCEL_CONDITIONAL_ORDER = 'CANCEL_CONDITIONAL_ORDER',
}

interface OperationDetails {
	type: OperationType;
	market?: Address;
	amount: bigint;
	marginAmount?: bigint;
}

const commandsValues = Object.values(commandsToNames);
const marketCommandNames = commandsValues.slice(4);
const closePositionCommands = commandsValues.slice(7, 10);
const openPositionCommands = commandsValues.slice(4, 7);

function isShortPosition(position: PositionDetail): boolean {
	return position.position.size < 0n;
}

function isMarketCommand(commandName: string): boolean {
	return marketCommandNames.includes(commandName);
}

function isOpenPositionCommand(commandName: string): boolean {
	return openPositionCommands.includes(commandName);
}

function isClosePositionCommand(commandName: string): boolean {
	return closePositionCommands.includes(commandName);
}

function isSetupConditionalOrderCommand(commandName: string): boolean {
	return commandName === commandsValues[12];
}

function parseOperationDetails(
	operations: ExecuteOperation[],
	positions: PositionDetail[]
): OperationDetails {
	const allArgs = operations.flatMap((operation) => operation.decodedArgs) as (bigint | Address)[];
	const market = allArgs.find((arg) => typeof arg === 'string' && isAddress(arg)) as Address;

	const modifyMargin = operations.find((operation) => operation.commandName === commandsValues[2]);
	const firstMarketOperation = operations.find((operation) =>
		isMarketCommand(operation.commandName)
	);
	const marketPosition = positions.find((position) => position.market.market === market);

	// These 2 values declared here instead of using else in the conditions below to make TS work correctly
	let amount = 0n;
	const marginAmount = modifyMargin?.decodedArgs[1] as bigint;
	let type: OperationType = OperationType.CANCEL_CONDITIONAL_ORDER;

	if (firstMarketOperation) {
		const { commandName: firstCommandName } = firstMarketOperation;

		amount = firstMarketOperation.decodedArgs[1] as bigint;

		if (marketPosition) {
			if (isClosePositionCommand(firstCommandName)) {
				type = isShortPosition(marketPosition)
					? OperationType.CLOSE_SHORT
					: OperationType.CLOSE_LONG;
			} else if (isOpenPositionCommand(firstCommandName)) {
				type = isShortPosition(marketPosition)
					? amount < 0n
						? OperationType.INCREASE_SIZE
						: OperationType.DECREASE_SIZE
					: amount < 0n
					? OperationType.DECREASE_SIZE
					: OperationType.INCREASE_SIZE;
			}
		} else if (isOpenPositionCommand(firstCommandName)) {
			type = amount < 0n ? OperationType.OPEN_SHORT : OperationType.OPEN_LONG;
		}
	} else if (modifyMargin) {
		type = marginAmount < 0n ? OperationType.DECREASE_MARGIN : OperationType.INCREASE_MARGIN;
	} else if (isSetupConditionalOrderCommand(operations[0].commandName)) {
		type = OperationType.PLACE_CONDITIONAL_ORDER;
	}

	return {
		type,
		market,
		amount,
		marginAmount,
	};
}

export { parseOperationDetails };
