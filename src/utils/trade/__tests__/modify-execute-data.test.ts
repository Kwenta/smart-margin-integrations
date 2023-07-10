import { parseEther } from 'viem';

import { CommandName } from '../../../constants/commands';
import type { PositionDetail } from '../../prepare';
import { getConditionalOrders, getWalletInfo } from '../../prepare';
import { type ModifyExecuteDataProps, modifyExecuteData } from '../modify-execute-data';
import type { ExecuteOperation } from '../parse-execute-data';
import type { OperationDetails } from '../parse-operation-details';
import { OperationType } from '../parse-operation-details';
import { selectPositionsForWidthdraw } from '../select-positions-for-widthdraw';

jest.mock('../../prepare', () => ({
	getWalletInfo: jest.fn(),
	getConditionalOrders: jest.fn(),
}));

jest.mock('../select-positions-for-widthdraw', () => ({
	selectPositionsForWidthdraw: jest.fn(),
}));

const address = '0x0000000000000000000000000000000000000000';

describe('modifyExecuteData', () => {
	test('should throw error for operation not found when opening a position', async () => {
		const operationDetails: OperationDetails = {
			type: OperationType.OPEN_LONG,
			market: address,
			marginAmount: parseEther('90'),
			amount: 0n,
			proportion: 0.5,
		};

		const operations: ExecuteOperation[] = [];

		const props: ModifyExecuteDataProps = {
			operationDetails,
			operations,
			address,
		};

		(getWalletInfo as jest.Mock).mockResolvedValue({
			positions: [],
			totalBalance: parseEther('100'),
			smartBalance: parseEther('50'),
		});

		await expect(modifyExecuteData(props)).rejects.toThrowError('Operation not found.');
	});

	test('should throw error when modified margin is less than MINIMUM_MARGIN_SIZE when opening a position', async () => {
		const operationDetails: OperationDetails = {
			type: OperationType.OPEN_LONG,
			market: address,
			amount: 0n,
			marginAmount: parseEther('90'),
			proportion: 0.5,
		};

		const operations: ExecuteOperation[] = [
			{
				commandName: CommandName.PERPS_V2_SUBMIT_ATOMIC_ORDER,
				decodedArgs: [address, parseEther('900')],
			},
		];

		const props: ModifyExecuteDataProps = {
			operationDetails,
			operations,
			address,
		};

		(getWalletInfo as jest.Mock).mockResolvedValue({
			positions: [
				{
					market: {
						market: address,
					},
					position: {
						size: 1n,
					},
					remainingMargin: 0n,
				},
			] as unknown as PositionDetail,
			totalBalance: parseEther('100'),
			smartBalance: parseEther('50'),
		});

		await expect(modifyExecuteData(props)).rejects.toThrowError(
			'Skip this operation. Margin will be greater than minimum margin.'
		);
	});

	test('should throw error when modified margin is more than total balance when opening a position', async () => {
		const operationDetails: OperationDetails = {
			type: OperationType.OPEN_LONG,
			market: address,
			amount: 0n,
			marginAmount: parseEther('900'),
			proportion: 0.5,
		};

		const operations: ExecuteOperation[] = [
			{
				commandName: CommandName.PERPS_V2_SUBMIT_ATOMIC_ORDER,
				decodedArgs: [address, parseEther('900')],
			},
		];

		const props: ModifyExecuteDataProps = {
			operationDetails,
			operations,
			address,
		};

		(getWalletInfo as jest.Mock).mockResolvedValue({
			positions: [
				{
					market: {
						market: address,
					},
					position: {
						size: 1n,
					},
					remainingMargin: 0n,
				},
			] as unknown as PositionDetail,
			totalBalance: parseEther('100'),
			smartBalance: parseEther('50'),
		});

		await expect(modifyExecuteData(props)).rejects.toThrowError(
			'Skip this operation. Not enough balance for open position.'
		);
	});

	test('should call selectPositionsForWidthdraw when smartBalance is less than modifiedMargin', async () => {
		const operationDetails: OperationDetails = {
			type: OperationType.OPEN_LONG,
			market: address,
			amount: 0n,
			marginAmount: parseEther('120'),
			proportion: 0.5,
		};

		const operations: ExecuteOperation[] = [
			{
				commandName: CommandName.PERPS_V2_SUBMIT_ATOMIC_ORDER,
				decodedArgs: [address, parseEther('900')],
			},
		];

		const props: ModifyExecuteDataProps = {
			operationDetails,
			operations,
			address,
		};

		const mockPositions = [
			{
				market: {
					market: address,
				},
				position: {
					size: 1n,
				},
				remainingMargin: 0n,
			},
		] as unknown as PositionDetail[];

		(getWalletInfo as jest.Mock).mockResolvedValue({
			positions: mockPositions,
			totalBalance: parseEther('500'),
			smartBalance: parseEther('40'),
		});

		(selectPositionsForWidthdraw as jest.Mock).mockReturnValue(mockPositions);

		await modifyExecuteData(props);
		expect(selectPositionsForWidthdraw).toHaveBeenCalledWith(mockPositions, parseEther('20'));
	});

	test('should add withdraw command when selectPositionsForWidthdraw returns some positions', async () => {
		const operationDetails: OperationDetails = {
			type: OperationType.OPEN_LONG,
			market: address,
			amount: 0n,
			marginAmount: parseEther('120'),
			proportion: 0.5,
		};

		const operations: ExecuteOperation[] = [
			{
				commandName: CommandName.PERPS_V2_SUBMIT_ATOMIC_ORDER,
				decodedArgs: [address, parseEther('900')],
			},
		];

		const props: ModifyExecuteDataProps = {
			operationDetails,
			operations,
			address,
		};

		const mockPositions = [
			{
				market: {
					market: address,
				},
				position: {
					size: 1n,
				},
				remainingMargin: 0n,
			},
		] as unknown as PositionDetail[];

		(getWalletInfo as jest.Mock).mockResolvedValue({
			positions: mockPositions,
			totalBalance: parseEther('500'),
			smartBalance: parseEther('40'),
		});

		(selectPositionsForWidthdraw as jest.Mock).mockReturnValueOnce([
			{ market: address, idleMargin: 1n },
		]);

		const newOperations = await modifyExecuteData(props);
		expect(newOperations).toContainEqual({
			commandName: CommandName.PERPS_V2_WITHDRAW_ALL_MARGIN,
			decodedArgs: [address],
		});
	});

	test('should throw error when selected positions for withdrawal are not enough to cover required margin', async () => {
		const operationDetails: OperationDetails = {
			type: OperationType.OPEN_LONG,
			market: address,
			amount: 0n,
			marginAmount: parseEther('120'),
			proportion: 0.5,
		};

		const operations: ExecuteOperation[] = [
			{
				commandName: CommandName.PERPS_V2_SUBMIT_ATOMIC_ORDER,
				decodedArgs: [address, parseEther('900')],
			},
		];

		const props: ModifyExecuteDataProps = {
			operationDetails,
			operations,
			address,
		};

		(getWalletInfo as jest.Mock).mockResolvedValue({
			positions: [],
			totalBalance: parseEther('500'),
			smartBalance: parseEther('40'),
		});

		(selectPositionsForWidthdraw as jest.Mock).mockReturnValue([]);

		await expect(modifyExecuteData(props)).rejects.toThrow(
			'Skip this operation. Not enough balance for open position.'
		);
	});

	test('should not throw an error when closing a long position', async () => {
		const operationDetails: OperationDetails = {
			type: OperationType.CLOSE_LONG,
			market: address,
			amount: 0n,
			marginAmount: parseEther('120'),
			proportion: 0.5,
		};

		const operations: ExecuteOperation[] = [
			{
				commandName: CommandName.PERPS_V2_SUBMIT_ATOMIC_ORDER,
				decodedArgs: [address, parseEther('-900')],
			},
		];

		const props: ModifyExecuteDataProps = {
			operationDetails,
			operations,
			address,
		};

		(getConditionalOrders as jest.Mock).mockResolvedValue([]);

		await expect(modifyExecuteData(props)).resolves.toBeTruthy();
	});
});
