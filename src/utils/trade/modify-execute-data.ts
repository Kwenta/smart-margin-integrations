import { type Address, parseUnits } from 'viem';

import { CommandName } from '../../constants/commands';
import { bigintToNumber } from '../helpers/';
import type { PositionDetail } from '../prepare';

import { type OperationDetails, OperationType } from './parse-operation-details';

import type { ExecuteOperation } from '.';

interface ModifyExecuteDataProps {
	operationDetails: OperationDetails;
	operations: ExecuteOperation[];
	positions: PositionDetail[];
	balance: bigint;
	address: Address;
}

function modifyExecuteData({
	operationDetails,
	positions,
	operations,
	balance,
	address,
}: ModifyExecuteDataProps): ExecuteOperation[] {
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

	const marketOperations = [...sizeOperations, ...closeOperations, ...marginOperations];

	if (marketOperations.includes(operationDetails.type)) {
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

			const size = parseUnits(
				(
					bigintToNumber(marketPosition.position.size) *
					proportion! *
					modifier
				).toString() as `${number}`,
				18
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
	}

	return [];
}

export { modifyExecuteData };
