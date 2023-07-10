import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import { SMART_MARGIN_ACCOUNT_ABI } from '../../../abi';
import { initClients } from '../../../config';
import { getPositions } from '../get-positions';
import { getWalletInfo } from '../get-wallet-info';

jest.mock('../../../config', () => ({
	initClients: jest.fn(),
}));

jest.mock('../../helpers', () => ({
	bigintToNumber: jest.fn(),
}));

jest.mock('../get-positions', () => ({
	getPositions: jest.fn().mockResolvedValue([]),
}));

jest.mock('../get-idle-margin', () => ({
	getIdleMargin: jest.fn().mockResolvedValue({ idleInMarkets: 0n }),
}));

describe('getWalletInfo', () => {
	test('should return wallet info with given address', async () => {
		const mockedClients = {
			publicClient: {
				readContract: jest.fn().mockResolvedValue(0n),
				chain: {
					id: 420,
				},
			},
		};

		(initClients as jest.Mock).mockReturnValue(mockedClients);
		const randomWallet = privateKeyToAccount(generatePrivateKey());

		const repeaterWallet = randomWallet.address;

		const walletInfo = await getWalletInfo({
			address: repeaterWallet,
			withOwnerBalance: false,
		});

		expect(walletInfo).toEqual({
			positions: [],
			idleMargin: { idleInMarkets: 0n },
			smartBalance: 0n,
			totalBalance: 0n,
		});

		expect(getPositions).toHaveBeenCalledWith(repeaterWallet);
		// Balance + owner calls
		expect(mockedClients.publicClient.readContract).toHaveBeenCalledTimes(2);
		expect(mockedClients.publicClient.readContract).toHaveBeenCalledWith({
			abi: SMART_MARGIN_ACCOUNT_ABI,
			address: repeaterWallet,
			functionName: 'freeMargin',
		});

		expect(mockedClients.publicClient.readContract).toHaveBeenCalledWith({
			abi: SMART_MARGIN_ACCOUNT_ABI,
			address: repeaterWallet,
			functionName: 'owner',
		});

		expect(initClients).toHaveBeenCalledTimes(1);
	});

	test('should return wallet info with owner balance', async () => {
		const randomWallet = privateKeyToAccount(generatePrivateKey());
		const repeaterWallet = randomWallet.address;

		const mockedClients = {
			publicClient: {
				readContract: jest.fn().mockResolvedValue(0n),
				chain: {
					id: 420,
				},
			},
		};

		(initClients as jest.Mock).mockReturnValue(mockedClients);

		mockedClients.publicClient.readContract
			.mockResolvedValueOnce(0n) // Free margin
			.mockResolvedValueOnce(repeaterWallet) // Owner
			.mockResolvedValueOnce(1000n); // owner's balance

		const walletInfo = await getWalletInfo({
			address: repeaterWallet,
			withOwnerBalance: true,
		});

		expect(walletInfo).toEqual({
			positions: [],
			idleMargin: { idleInMarkets: 0n },
			smartBalance: 0n,
			totalBalance: 1000n,
		});

		expect(getPositions).toHaveBeenCalledWith(repeaterWallet);
		expect(mockedClients.publicClient.readContract).toHaveBeenCalledTimes(3);
	});
});
