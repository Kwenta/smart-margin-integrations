import { type Address, parseEther } from 'viem';

import { CommandName } from '../../constants/commands';
import { bigintToNumber } from '../helpers/';
import { getWalletInfo } from '../prepare';

import {
	type OperationDetails,
	OperationType,
	closePositionCommands,
} from './parse-operation-details';

import { type ExecuteOperation, selectPositionsForWidthdraw } from '.';

interface ModifyExecuteDataProps {
	operationDetails: OperationDetails;
	operations: ExecuteOperation[];
	address: Address;
}

const MINIMUM_MARGIN_SIZE = parseEther('50');

async function modifyExecuteData({
	operationDetails,
	operations,
	address,
}: ModifyExecuteDataProps): Promise<ExecuteOperation[]> {
	const {
		positions,
		totalBalance: balance,
		smartBalance,
	} = await getWalletInfo({
		address,
		withOwnerBalance: false,
	});

	const { proportion, market } = operationDetails;

	const marketPosition = positions.find(
		(position) => position.market.market === market && position.position.size !== 0n
	)!;

	const sizeOperations = [OperationType.INCREASE_SIZE, OperationType.DECREASE_SIZE];
	const closeOperations = [OperationType.CLOSE_LONG, OperationType.CLOSE_SHORT];
	const marginOperations = [OperationType.INCREASE_MARGIN, OperationType.DECREASE_MARGIN];
	const conditionalOperations = [
		OperationType.CANCEL_CONDITIONAL_ORDER,
		OperationType.PLACE_CONDITIONAL_ORDER,
	];
	const openOperations = [OperationType.OPEN_LONG, OperationType.OPEN_SHORT];

	const marketOperations = [
		...sizeOperations,
		...openOperations,
		...closeOperations,
		...marginOperations,
	];

	if (marketOperations.includes(operationDetails.type)) {
		if (openOperations.includes(operationDetails.type)) {
			const openCommands = [
				CommandName.PERPS_V2_SUBMIT_ATOMIC_ORDER,
				CommandName.PERPS_V2_SUBMIT_DELAYED_ORDER,
				CommandName.PERPS_V2_SUBMIT_OFFCHAIN_DELAYED_ORDER,
			];
			const { decodedArgs: openDecodedArgs, commandName: openCommandName } = operations.find(
				({ commandName, decodedArgs }) =>
					openCommands.includes(commandName) && decodedArgs[0] === operationDetails.market
			)!;

			if (!openDecodedArgs) {
				throw new Error('Operation not found.');
			}
			const modifier = operationDetails.type === OperationType.OPEN_LONG ? 1 : -1;

			const modifiedMargin = parseEther(
				(bigintToNumber(operationDetails.marginAmount!) * proportion!).toString() as `${number}`
			);

			const modifiedSize = parseEther(
				(
					bigintToNumber(openDecodedArgs[1] as bigint) *
					proportion! *
					modifier
				).toString() as `${number}`
			);

			// Check if modified margin is lower than minimum margin
			if (modifiedMargin < MINIMUM_MARGIN_SIZE) {
				throw new Error('Skip this operation. Margin will be greater than minimum margin.');
			}

			if (modifiedMargin > balance) {
				throw new Error('Skip this operation. Not enough balance for open position.');
			}

			const responseOperations: ExecuteOperation[] = [];

			if (modifiedMargin > smartBalance) {
				const positionsForWidthdraw = selectPositionsForWidthdraw(
					positions,
					modifiedMargin - smartBalance
				);

				if (positionsForWidthdraw.length === 0) {
					throw new Error('Skip this operation. Not enough balance for open position.');
				}

				responseOperations.push(
					...positionsForWidthdraw.map(({ market }) => ({
						commandName: CommandName.PERPS_V2_WITHDRAW_ALL_MARGIN,
						decodedArgs: [market],
					}))
				);
			}

			const modifiedArgs = [...openDecodedArgs];
			modifiedArgs[1] = modifiedSize;
			responseOperations.push(
				{
					commandName: CommandName.PERPS_V2_MODIFY_MARGIN,
					decodedArgs: [market, modifiedMargin],
				},
				{
					commandName: openCommandName,
					decodedArgs: modifiedArgs,
				}
			);

			return responseOperations;
		}

		if (marketPosition?.position.size === 0n) {
			throw new Error('Skip this operations. Position size is 0.');
		}

		if (sizeOperations.includes(operationDetails.type)) {
			const { decodedArgs, commandName } = operations.find(
				(operation) => operation.commandName === CommandName.PERPS_V2_SUBMIT_OFFCHAIN_DELAYED_ORDER
			)!;

			if (!decodedArgs) {
				throw new Error('Operation not found.');
			}

			const modifier = operationDetails.type === OperationType.INCREASE_SIZE ? 1 : -1;

			const size = parseEther(
				(
					bigintToNumber(marketPosition.position.size) *
					proportion! *
					modifier
				).toString() as `${number}`
			);

			// Create new decodedArgs with modified size
			const newDecodedArgs = [decodedArgs[0], size, decodedArgs[2]];

			return [
				{
					commandName,
					decodedArgs: newDecodedArgs,
				},
			];
		}

		if (closeOperations.includes(operationDetails.type)) {
			// TODO: Check for conditional orders here
			return operations.filter((operation) =>
				closePositionCommands.includes(operation.commandName)
			);
		}

		if (marginOperations.includes(operationDetails.type)) {
			const { decodedArgs, commandName } = operations.find(
				(operation) => operation.commandName === CommandName.PERPS_V2_MODIFY_MARGIN
			)!;

			if (!decodedArgs) {
				throw new Error('Operation not found.');
			}

			const modifier = operationDetails.type === OperationType.INCREASE_MARGIN ? 1 : -1;

			const size = parseEther(
				(
					bigintToNumber(marketPosition.position.margin) *
					proportion! *
					modifier
				).toString() as `${number}`
			);

			// Check if size is bigger than balance (when increasing margin)
			if (operationDetails.type === OperationType.INCREASE_MARGIN && size > balance) {
				throw new Error('Skip this operation. Not enough balance for increase margin.');
			}

			// Check if margin will be bigger than minimum margin
			if (operationDetails.type === OperationType.DECREASE_MARGIN) {
				const finalMargin = marketPosition.position.margin + size; // Use plus, because size is negative
				if (finalMargin < MINIMUM_MARGIN_SIZE) {
					throw new Error('Skip this operation. Margin will be less than minimum margin.');
				}
			}

			// Create new decodedArgs with modified size
			const newDecodedArgs = [decodedArgs[0], size];

			return [
				{
					commandName,
					decodedArgs: newDecodedArgs,
				},
			];
		}
	}

	return operations;
}

export { modifyExecuteData };
