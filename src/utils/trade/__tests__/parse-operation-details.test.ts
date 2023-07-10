import type { Address } from 'viem';

import type { ExecuteOperation, OperationDetails } from '..';
import { CommandName, ConditionalOrderTypeEnum } from '../../../constants/commands';
import type { PositionDetail } from '../../prepare';
import { OperationType, parseOperationDetails } from '../parse-operation-details';

describe('parseOperationDetails', () => {
	test('should return correct OperationDetails when provided with valid input and without margin modifying', async () => {
		const address = '0x0000000000000000000000000000000000000000';
		const operations: ExecuteOperation[] = [
			{
				commandName: CommandName.PERPS_V2_SUBMIT_DELAYED_ORDER,
				decodedArgs: [address, -500n, 1300n],
			},
		];

		const balance = 100n;
		const repeaterBalance = 100n;
		const expectedOperationDetails: OperationDetails = {
			type: OperationType.OPEN_SHORT,
			amount: -500n,
			marginAmount: undefined,
			conditionalParams: {},
			market: address,
			proportion: 1,
		};

		const result = await parseOperationDetails(
			operations,
			[],
			[],
			address,
			balance,
			repeaterBalance
		);

		expect(result).toEqual(expectedOperationDetails);
	});

	test('should return correct OperationDetails with OPEN_SHORT when provided with valid input and with margin modifying', async () => {
		const address = '0x0000000000000000000000000000000000000000';
		const operations: ExecuteOperation[] = [
			{
				commandName: CommandName.PERPS_V2_MODIFY_MARGIN,
				decodedArgs: [address, 5555555n],
			},
			{
				commandName: CommandName.PERPS_V2_SUBMIT_DELAYED_ORDER,
				decodedArgs: [address, -500n, 1300n],
			},
		];

		const balance = 100n;
		const repeaterBalance = 100n;
		const expectedOperationDetails: OperationDetails = {
			type: OperationType.OPEN_SHORT,
			amount: -500n,
			marginAmount: 5555555n,
			conditionalParams: {},
			market: address,
			proportion: 1,
		};

		const result = await parseOperationDetails(
			operations,
			[],
			[],
			address,
			balance,
			repeaterBalance
		);

		expect(result).toEqual(expectedOperationDetails);
	});

	test('should return correct OperationDetails with OPEN_LONG when provided with valid input and with margin modifying', async () => {
		const address = '0x0000000000000000000000000000000000000000';
		const operations: ExecuteOperation[] = [
			{
				commandName: CommandName.PERPS_V2_MODIFY_MARGIN,
				decodedArgs: [address, 5555555n],
			},
			{
				commandName: CommandName.PERPS_V2_SUBMIT_DELAYED_ORDER,
				decodedArgs: [address, 500n, 1300n],
			},
		];

		const balance = 100n;
		const repeaterBalance = 100n;
		const expectedOperationDetails: OperationDetails = {
			type: OperationType.OPEN_LONG,
			amount: 500n,
			marginAmount: 5555555n,
			conditionalParams: {},
			market: address,
			proportion: 1,
		};

		const result = await parseOperationDetails(
			operations,
			[],
			[],
			address,
			balance,
			repeaterBalance
		);

		expect(result).toEqual(expectedOperationDetails);
	});

	test('should return correct proportion when provided with valid input and with margin modifying', async () => {
		const address = '0x0000000000000000000000000000000000000000';
		const operations: ExecuteOperation[] = [
			{
				commandName: CommandName.PERPS_V2_MODIFY_MARGIN,
				decodedArgs: [address, 5555555n],
			},
			{
				commandName: CommandName.PERPS_V2_SUBMIT_DELAYED_ORDER,
				decodedArgs: [address, 500n, 1300n],
			},
		];

		const balance = 1000n;
		const repeaterBalance = 100n;
		const expectedOperationDetails: OperationDetails = {
			type: OperationType.OPEN_LONG,
			amount: 500n,
			marginAmount: 5555555n,
			conditionalParams: {},
			market: address,
			proportion: 0.1,
		};

		const result = await parseOperationDetails(
			operations,
			[],
			[],
			address,
			balance,
			repeaterBalance
		);

		expect(result).toEqual(expectedOperationDetails);
	});

	test('should return correct modify margin when provided with valid input and increase margin', async () => {
		const address = '0x0000000000000000000000000000000000000000';

		const operations: ExecuteOperation[] = [
			{
				commandName: CommandName.PERPS_V2_MODIFY_MARGIN,
				decodedArgs: [address, 10000n],
			},
		];

		const balance = 100n;
		const repeaterBalance = 50n;
		const expectedOperationDetails: OperationDetails = {
			type: OperationType.INCREASE_MARGIN,
			amount: 0n,
			marginAmount: 10000n,
			conditionalParams: {},
			market: address,
			proportion: 0.1,
		};

		const result = await parseOperationDetails(
			operations,
			[
				{
					market: {
						market: address,
					},
					position: {
						margin: 100000n,
					},
				} as unknown as PositionDetail,
			],
			[],
			address,
			balance,
			repeaterBalance
		);

		expect(result).toEqual(expectedOperationDetails);
	});

	test('should return correct modify margin when provided with valid input and decrease margin', async () => {
		const address = '0x0000000000000000000000000000000000000000';
		const operations: ExecuteOperation[] = [
			{
				commandName: CommandName.PERPS_V2_MODIFY_MARGIN,
				decodedArgs: [address, -10000n],
			},
		];

		const balance = 100n;
		const repeaterBalance = 50n;
		const expectedOperationDetails: OperationDetails = {
			type: OperationType.DECREASE_MARGIN,
			amount: 0n,
			marginAmount: -10000n,
			conditionalParams: {},
			market: address,
			proportion: 0.1,
		};

		const result = await parseOperationDetails(
			operations,
			[
				{
					market: {
						market: address,
					},
					position: {
						margin: 100000n,
					},
				} as unknown as PositionDetail,
			],
			[],
			address,
			balance,
			repeaterBalance
		);

		expect(result).toEqual(expectedOperationDetails);
	});

	test('should correctly parse opening a conditional order', async () => {
		const address = '0x0000000000000000000000000000000000000000';
		const key = `${address}key`;
		const operations: ExecuteOperation[] = [
			{
				commandName: CommandName.GELATO_PLACE_CONDITIONAL_ORDER,
				decodedArgs: [
					key,
					0n, // triggerPrice
					0n, // amount
					100n, // targetPrice
					ConditionalOrderTypeEnum.LIMIT, // orderType
					110n, // desiredFillPrice
				],
			},
		];

		const balance = 0n;
		const repeaterBalance = 0n;

		const result = await parseOperationDetails(
			operations,
			[
				{
					market: {
						market: address,
						key,
					},
					position: {
						margin: 100000n,
					},
				} as unknown as PositionDetail,
			],
			[],
			address,
			balance,
			repeaterBalance
		);

		const expectedOperationDetails: OperationDetails = {
			type: OperationType.PLACE_CONDITIONAL_ORDER,
			amount: 0n,
			marginAmount: undefined,
			conditionalParams: {
				takeProfit: {
					price: 100n,
					desiredFillPrice: 110n,
				},
			},
			market: address,
			proportion: 1,
		};

		expect(result).toEqual(expectedOperationDetails);
	});

	test('should correctly parse closing a conditional order', async () => {
		const address = '0x0000000000000000000000000000000000000000';
		const key: Address = `${address}key`;
		const orderId = 11n;
		const operations: ExecuteOperation[] = [
			{
				commandName: CommandName.GELATO_CANCEL_CONDITIONAL_ORDER,
				decodedArgs: [orderId],
			},
		];

		const balance = 0n;
		const repeaterBalance = 0n;

		const result = await parseOperationDetails(
			operations,
			[
				{
					market: {
						market: address,
						key,
					},
					position: {
						margin: 100000n,
					},
				} as unknown as PositionDetail,
			],
			[
				{
					conditionalOrderType: ConditionalOrderTypeEnum.LIMIT,
					desiredFillPrice: 110n,
					gelatoTaskId: '0x1',
					index: orderId,
					marginDelta: 10n,
					marketKey: key,
					reduceOnly: true,
					sizeDelta: 10n,
					targetPrice: 100n,
				},
			],
			address,
			balance,
			repeaterBalance
		);

		const expectedOperationDetails: OperationDetails = {
			type: OperationType.PLACE_CONDITIONAL_ORDER,
			amount: 0n,
			marginAmount: undefined,
			conditionalParams: {
				takeProfit: {
					isCancelled: true,
					price: 100n,
					desiredFillPrice: 110n,
				},
			},
			market: address,
			proportion: 1,
		};

		expect(result).toEqual(expectedOperationDetails);
	});
});
