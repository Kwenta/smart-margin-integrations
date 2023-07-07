import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import { SMART_MARGIN_ACCOUNT_ABI } from '../../../abi';
import { initClients } from '../../../config';
import { bigintToNumber } from '../../helpers';
import { getConditionalOrders } from '../get-conditional-orders';

jest.mock('../../../config', () => ({
	initClients: jest.fn(),
}));

jest.mock('../../helpers', () => ({
	bigintToNumber: jest.fn(),
}));

describe('getConditionalOrders', () => {
	it('should return last 3 orders if orders count = 3', async () => {
		const randomWallet = privateKeyToAccount(generatePrivateKey());

		const address = randomWallet.address;
		const lastOrderId = 3n;

		const mockedClients = {
			publicClient: {
				readContract: jest.fn().mockResolvedValue(lastOrderId),
				multicall: jest.fn().mockResolvedValue(
					Array(3)
						.fill(null)
						.map((_, i) => ({
							targetPrice: BigInt(i),
						}))
				),
			},
		};

		(initClients as jest.Mock).mockReturnValue(mockedClients);
		(bigintToNumber as jest.Mock).mockReturnValue(3);

		const result = await getConditionalOrders(address);

		// First target price = 0n, so we should get 3 orders and 2 filled
		expect(result).toHaveLength(2);

		expect(mockedClients.publicClient.readContract).toHaveBeenCalledWith({
			abi: SMART_MARGIN_ACCOUNT_ABI,
			address,
			functionName: 'conditionalOrderId',
		});

		expect(mockedClients.publicClient.multicall).toHaveBeenCalledWith({
			contracts: Array(3)
				.fill(null)
				.map((_, i) => ({
					abi: SMART_MARGIN_ACCOUNT_ABI,
					address,
					functionName: 'getConditionalOrder',
					args: [BigInt(i)],
				})),
			allowFailure: false,
		});
	});
	it('should return last 500 orders if orders count > 500', async () => {
		const randomWallet = privateKeyToAccount(generatePrivateKey());

		const address = randomWallet.address;
		const lastOrderId = 502n;

		const mockedClients = {
			publicClient: {
				readContract: jest.fn().mockResolvedValue(lastOrderId),
				multicall: jest.fn().mockResolvedValue(
					Array(500)
						.fill(null)
						.map((_, i) => ({
							targetPrice: BigInt(i),
						}))
				),
			},
		};

		(initClients as jest.Mock).mockReturnValue(mockedClients);
		(bigintToNumber as jest.Mock).mockReturnValue(500);

		const result = await getConditionalOrders(address);

		// First target price = 0n, so we should get 500 orders and 499 filled
		expect(result).toHaveLength(499);

		expect(mockedClients.publicClient.readContract).toHaveBeenCalledWith({
			abi: SMART_MARGIN_ACCOUNT_ABI,
			address,
			functionName: 'conditionalOrderId',
		});

		expect(mockedClients.publicClient.multicall).toHaveBeenCalledWith({
			contracts: Array(500)
				.fill(null)
				.map((_, i) => ({
					abi: SMART_MARGIN_ACCOUNT_ABI,
					address,
					functionName: 'getConditionalOrder',
					args: [BigInt(i) + 2n],
				})),
			allowFailure: false,
		});
	});

	it('should return empty array if orders count = 0', async () => {
		const randomWallet = privateKeyToAccount(generatePrivateKey());

		const address = randomWallet.address;
		const lastOrderId = 0n;

		const mockedClients = {
			publicClient: {
				readContract: jest.fn().mockResolvedValue(lastOrderId),
			},
		};

		(initClients as jest.Mock).mockReturnValue(mockedClients);

		const result = await getConditionalOrders(address);

		expect(result).toHaveLength(0);

		expect(mockedClients.publicClient.readContract).toHaveBeenCalledWith({
			abi: SMART_MARGIN_ACCOUNT_ABI,
			address,
			functionName: 'conditionalOrderId',
		});
	});
});
