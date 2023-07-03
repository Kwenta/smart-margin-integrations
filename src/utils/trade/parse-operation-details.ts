import type { Address } from 'viem';
import { isAddress } from 'viem';

import { SMART_MARGIN_ACCOUNT_ABI } from '../../abi';
import { initClients } from '../../config';
import { CommandName, commandsToNames } from '../../constants/commands';
import { bigintToNumber } from '../helpers/';
import type { PositionDetail } from '../prepare';

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
	proportion?: number;
}

const commandsValues = Object.values(commandsToNames);
const marketCommandNames = commandsValues.slice(4);
// TODO: Move to constants
export const closePositionCommands = commandsValues.slice(7, 10);
const openPositionCommands = commandsValues.slice(4, 7);
const conditionalOrderCommands = commandsValues.slice(11);

function isShortPosition(position: PositionDetail): boolean {
	return position.position.size < 0n;
}

function isMarketCommand(commandName: CommandName): boolean {
	return marketCommandNames.includes(commandName);
}

function isOpenPositionCommand(commandName: CommandName): boolean {
	return openPositionCommands.includes(commandName);
}

function isClosePositionCommand(commandName: CommandName): boolean {
	return closePositionCommands.includes(commandName);
}

function isSetupConditionalOrderCommand(commandName: CommandName): boolean {
	return commandName === commandsValues[12];
}

async function parseOperationDetails(
	operations: ExecuteOperation[],
	positions: PositionDetail[],
	address: Address,
	balance: bigint,
	repeaterBalance: bigint
): Promise<OperationDetails> {
	const allArgs = operations
		.filter(
			(operation) =>
				marketCommandNames.includes(operation.commandName) ||
				operation.commandName === CommandName.PERPS_V2_MODIFY_MARGIN
		)
		.flatMap((operation) => operation.decodedArgs) as (bigint | Address)[];

	let market = allArgs.find((arg) => typeof arg === 'string' && isAddress(arg)) as Address;

	const modifyMargin = operations.find(
		(operation) => operation.commandName === CommandName.PERPS_V2_MODIFY_MARGIN
	);

	const firstMarketOperation = operations.find((operation) =>
		isMarketCommand(operation.commandName)
	);
	const marketPosition = positions.find(
		(position) => position.market.market === market && position.position.size !== 0n
	);

	// These 2 values declared here instead of using else in the conditions below to make TS work correctly
	let amount = 0n;
	let proportion = 1;
	const marginAmount = modifyMargin?.decodedArgs[1] as bigint;
	let type: OperationType = OperationType.CANCEL_CONDITIONAL_ORDER;

	if (firstMarketOperation) {
		const { commandName: firstCommandName } = firstMarketOperation;

		amount = firstMarketOperation.decodedArgs[1] as bigint;

		// Modify existing position
		if (marketPosition) {
			proportion = bigintToNumber(amount) / bigintToNumber(marketPosition.position.size);
			// Close position
			if (isClosePositionCommand(firstCommandName)) {
				proportion = 1;
				amount = marketPosition.position.size;
				type = isShortPosition(marketPosition)
					? OperationType.CLOSE_SHORT
					: OperationType.CLOSE_LONG;
				// Open position
			} else if (isOpenPositionCommand(firstCommandName)) {
				type = isShortPosition(marketPosition)
					? amount < 0n
						? OperationType.INCREASE_SIZE
						: OperationType.DECREASE_SIZE
					: amount < 0n
					? OperationType.DECREASE_SIZE
					: OperationType.INCREASE_SIZE;
			}
			// Open new position
		} else if (isOpenPositionCommand(firstCommandName)) {
			proportion = bigintToNumber(repeaterBalance) / bigintToNumber(balance);
			type = amount < 0n ? OperationType.OPEN_SHORT : OperationType.OPEN_LONG;
		}
		// Modify margin
	} else if (modifyMargin) {
		type = marginAmount < 0n ? OperationType.DECREASE_MARGIN : OperationType.INCREASE_MARGIN;
		proportion = bigintToNumber(marginAmount) / bigintToNumber(marketPosition!.position.margin);
		// Setup conditional order (without market operation)
	} else if (isSetupConditionalOrderCommand(operations[0].commandName)) {
		type = OperationType.PLACE_CONDITIONAL_ORDER;
	}

	if (conditionalOrderCommands.includes(operations[0].commandName)) {
		const { publicClient } = initClients();
		const orderDetail = await publicClient.readContract({
			abi: SMART_MARGIN_ACCOUNT_ABI,
			address,
			functionName: 'getConditionalOrder',
			args: [operations[0].decodedArgs[0] as bigint],
		});

		const findedMarket = positions.find((position) => position.market.key === orderDetail.marketKey)
			?.market.market;
		if (findedMarket) {
			market = findedMarket;
		}
	}
	return {
		type,
		market,
		amount,
		proportion: Math.abs(proportion),
		marginAmount,
	};
}

export { parseOperationDetails, isShortPosition, OperationType };
export type { OperationDetails };
