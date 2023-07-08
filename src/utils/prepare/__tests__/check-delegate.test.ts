import { isAddressEqual } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import { SMART_MARGIN_ACCOUNT_ABI } from '../../../abi';
import { initClients } from '../../../config';
import { checkDelegate } from '../check-delegate';

jest.mock('../../../config', () => ({
	initClients: jest.fn(),
}));

jest.mock('viem', () => ({
	isAddressEqual: jest.fn(),
}));

describe('checkDelegate', () => {
	test('should return true when the executor is owner', async () => {
		const randomWallet = privateKeyToAccount(generatePrivateKey());

		const repeaterWallet = randomWallet.address;
		const executorAddress = randomWallet.address;

		const mockedClients = {
			publicClient: {
				multicall: jest.fn().mockResolvedValue([{ result: null }, { result: executorAddress }]),
			},
			walletClient: {
				account: {
					address: executorAddress,
				},
			},
		};

		(initClients as jest.Mock).mockReturnValue(mockedClients);
		(isAddressEqual as jest.Mock).mockReturnValue(true);

		const result = await checkDelegate({ repeaterWallet });

		expect(result).toBe(true);
		expect(isAddressEqual).toHaveBeenCalledWith(executorAddress, executorAddress);
		expect(mockedClients.publicClient.multicall).toHaveBeenCalledWith({
			contracts: [
				{
					address: repeaterWallet,
					abi: SMART_MARGIN_ACCOUNT_ABI,
					functionName: 'delegates',
					args: [executorAddress],
				},
				{
					address: repeaterWallet,
					abi: SMART_MARGIN_ACCOUNT_ABI,
					functionName: 'owner',
				},
			],
		});
	});

	test('should return true when the executor is a delegate', async () => {
		const randomWallet = privateKeyToAccount(generatePrivateKey());
		const secondRandomWallet = privateKeyToAccount(generatePrivateKey());

		const repeaterWallet = randomWallet.address;
		const executorAddress = randomWallet.address;
		const otherAddress = secondRandomWallet.address;

		const mockedClients = {
			publicClient: {
				multicall: jest
					.fn()
					.mockResolvedValue([{ result: executorAddress }, { result: otherAddress }]),
			},
			walletClient: {
				account: {
					address: executorAddress,
				},
			},
		};

		(initClients as jest.Mock).mockReturnValue(mockedClients);
		(isAddressEqual as jest.Mock).mockReturnValue(false);

		const result = await checkDelegate({ repeaterWallet });

		expect(result).toBe(true);
		expect(isAddressEqual).toHaveBeenCalledWith(otherAddress, executorAddress);
		expect(mockedClients.publicClient.multicall).toHaveBeenCalledWith({
			contracts: [
				{
					address: repeaterWallet,
					abi: SMART_MARGIN_ACCOUNT_ABI,
					functionName: 'delegates',
					args: [executorAddress],
				},
				{
					address: repeaterWallet,
					abi: SMART_MARGIN_ACCOUNT_ABI,
					functionName: 'owner',
				},
			],
		});
	});

	test('should return false when the executor is neither a delegate nor an owner', async () => {
		const randomWallet = privateKeyToAccount(generatePrivateKey());
		const secondRandomWallet = privateKeyToAccount(generatePrivateKey());

		const repeaterWallet = randomWallet.address;
		const executorAddress = randomWallet.address;
		const otherAddress = secondRandomWallet.address;

		const mockedClients = {
			publicClient: {
				multicall: jest.fn().mockResolvedValue([{ result: null }, { result: otherAddress }]),
			},
			walletClient: {
				account: {
					address: executorAddress,
				},
			},
		};

		(initClients as jest.Mock).mockReturnValue(mockedClients);
		(isAddressEqual as jest.Mock).mockReturnValue(false);

		const result = await checkDelegate({ repeaterWallet });

		expect(result).toBe(false);
		expect(isAddressEqual).toHaveBeenCalledWith(otherAddress, executorAddress);
		expect(mockedClients.publicClient.multicall).toHaveBeenCalledWith({
			contracts: [
				{
					address: repeaterWallet,
					abi: SMART_MARGIN_ACCOUNT_ABI,
					functionName: 'delegates',
					args: [executorAddress],
				},
				{
					address: repeaterWallet,
					abi: SMART_MARGIN_ACCOUNT_ABI,
					functionName: 'owner',
				},
			],
		});
	});
});
