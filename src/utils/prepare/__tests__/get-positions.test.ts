import { PERPS_V2_MARKET_DATA_ABI } from '../../../abi';
import { initClients } from '../../../config';
import { PERPS_V2_MARKET_DATA } from '../../../constants/address';
import { getPositions } from '../get-positions';

jest.mock('../../../config', () => ({
	initClients: jest.fn(),
}));

jest.mock('../../helpers', () => ({
	bigintToNumber: jest.fn(),
}));

describe('getPositions', () => {
	it('should return all positions if there are fewer than 500', async () => {
		const address = '0xWallet';

		const mockedClients = {
			publicClient: {
				readContract: jest.fn().mockResolvedValueOnce([
					{ key: '0xKey1', market: '0xMarket1' },
					{ key: '0xKey2', market: '0xMarket2' },
				]),
				multicall: jest.fn().mockResolvedValueOnce([
					{ status: 'success', result: { key: '0xKey1', position: {} } },
					{ status: 'success', result: { key: '0xKey2', position: {} } },
				]),
				chain: {
					id: 420,
				},
			},
		};

		(initClients as jest.Mock).mockReturnValue(mockedClients);

		const result = await getPositions(address);

		expect(result).toHaveLength(2);

		expect(mockedClients.publicClient.readContract).toHaveBeenCalledWith({
			abi: PERPS_V2_MARKET_DATA_ABI,
			address: PERPS_V2_MARKET_DATA[mockedClients.publicClient.chain.id],
			functionName: 'allProxiedMarketSummaries',
		});

		expect(mockedClients.publicClient.multicall).toHaveBeenCalledWith({
			contracts: [
				{
					abi: PERPS_V2_MARKET_DATA_ABI,
					address: PERPS_V2_MARKET_DATA[mockedClients.publicClient.chain.id],
					functionName: 'positionDetailsForMarketKey',
					args: ['0xKey1', address],
				},
				{
					abi: PERPS_V2_MARKET_DATA_ABI,
					address: PERPS_V2_MARKET_DATA[mockedClients.publicClient.chain.id],
					functionName: 'positionDetailsForMarketKey',
					args: ['0xKey2', address],
				},
			],
		});
	});
});
