import type { Address } from 'viem';
import { formatEther, isAddress } from 'viem';

import {
	CommandName,
	ConditionalOrderTypeEnum,
	conditionalOrderCommands,
	isClosePositionCommand,
	isMarketCommand,
	isOpenPositionCommand,
	marketCommandNames,
} from '../../constants/commands';
import { isShortPosition } from '../helpers/is-short-position';
import type { PositionDetail } from '../prepare';
import type { OrdersResponse } from '../prepare/get-conditional-orders';

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
}

interface ConditionalParams {
	stopLoss?: {
		price: bigint;
		desiredFillPrice: bigint;
		isCancelled?: boolean;
	};
	takeProfit?: {
		price: bigint;
		desiredFillPrice: bigint;
		isCancelled?: boolean;
	};
}

interface OperationDetails {
	type: OperationType;
	market?: Address;
	amount: bigint;
	marginAmount?: bigint;
	proportion?: number;
	conditionalParams?: ConditionalParams;
}

async function parseOperationDetails(
	operations: ExecuteOperation[],
	positions: PositionDetail[],
	orders: OrdersResponse[],
	address: Address,
	balance: bigint,
	repeaterBalance: bigint
): Promise<OperationDetails> {
	const { evaluate, format } = await import('mathjs');
	const conditionalParams: ConditionalParams = {};
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
	let type: OperationType = OperationType.PLACE_CONDITIONAL_ORDER;

	if (firstMarketOperation) {
		const { commandName: firstCommandName } = firstMarketOperation;

		amount = firstMarketOperation.decodedArgs[1] as bigint;

		// Modify existing position
		if (marketPosition) {
			proportion = Number.parseFloat(
				format(evaluate(`${formatEther(amount)} / ${formatEther(marketPosition.position.size)}`), {
					precision: 14,
				})
			);
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
			proportion = Number.parseFloat(
				format(evaluate(`${formatEther(repeaterBalance)} / ${formatEther(balance)}`), {
					precision: 14,
				})
			);
			type = amount < 0n ? OperationType.OPEN_SHORT : OperationType.OPEN_LONG;
		}
		// Modify margin
	} else if (modifyMargin) {
		type = marginAmount < 0n ? OperationType.DECREASE_MARGIN : OperationType.INCREASE_MARGIN;
		proportion = Number.parseFloat(
			format(
				evaluate(`${formatEther(marginAmount)} / ${formatEther(marketPosition!.position.margin)}`),
				{
					precision: 14,
				}
			)
		);
		// Setup conditional order (without market operation)
	} else if (
		operations.some((operation) => conditionalOrderCommands.includes(operation.commandName))
	) {
		const placeOperations = operations.filter(
			(operation) => operation.commandName === CommandName.GELATO_PLACE_CONDITIONAL_ORDER
		);

		const cancelOperations = operations.filter(
			(operation) => operation.commandName === CommandName.GELATO_CANCEL_CONDITIONAL_ORDER
		);

		const takeProfit = placeOperations.find(
			(operation) => operation.decodedArgs[4] === ConditionalOrderTypeEnum.LIMIT
		);

		const stopLoss = placeOperations.find(
			(operation) => operation.decodedArgs[4] === ConditionalOrderTypeEnum.STOP
		);

		if (takeProfit || stopLoss) {
			const findedMarket = positions.find(
				(position) => position.market.key === placeOperations[0].decodedArgs[0]
			)?.market.market;
			if (findedMarket) {
				market = findedMarket;
			}
		}
		if (takeProfit) {
			conditionalParams.takeProfit = {
				price: takeProfit.decodedArgs[3] as bigint,
				desiredFillPrice: takeProfit.decodedArgs[5] as bigint,
			};
		}

		if (stopLoss) {
			conditionalParams.stopLoss = {
				price: stopLoss.decodedArgs[3] as bigint,
				desiredFillPrice: stopLoss.decodedArgs[5] as bigint,
			};
		}

		if (cancelOperations.length > placeOperations.length) {
			const order = orders.find(
				(order) => order.index === (cancelOperations[0].decodedArgs[0] as bigint)
			);
			if (!order) {
				throw new Error('Order not found');
			}
			const { targetPrice, desiredFillPrice } = order;

			if (takeProfit) {
				conditionalParams.stopLoss = {
					isCancelled: true,
					desiredFillPrice,
					price: targetPrice,
				};
			} else if (stopLoss) {
				conditionalParams.takeProfit = {
					isCancelled: true,
					desiredFillPrice,
					price: targetPrice,
				};
			} else {
				const findedMarket = positions.find((position) => position.market.key === order.marketKey)
					?.market.market;
				if (findedMarket) {
					market = findedMarket;
				}

				if (order.conditionalOrderType === ConditionalOrderTypeEnum.LIMIT) {
					conditionalParams.takeProfit = {
						price: targetPrice,
						desiredFillPrice,
						isCancelled: true,
					};
				}

				if (order.conditionalOrderType === ConditionalOrderTypeEnum.STOP) {
					conditionalParams.stopLoss = {
						price: targetPrice,
						desiredFillPrice,
						isCancelled: true,
					};
				}
			}
		}
	}

	return {
		type,
		market,
		amount,
		proportion: Math.abs(proportion),
		marginAmount,
		conditionalParams,
	};
}

export { parseOperationDetails, isShortPosition, OperationType };
export type { OperationDetails };
