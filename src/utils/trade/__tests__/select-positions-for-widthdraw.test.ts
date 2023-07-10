import { type IdlePosition, getIdleMargin } from '../../prepare';
import { selectPositionsForWidthdraw } from '../select-positions-for-widthdraw';

jest.mock('../../prepare', () => ({
	getIdleMargin: jest.fn(),
}));

describe('selectPositionsForWidthdraw', () => {
	test('should select positions with biggest idleMargin until total amount is covered', () => {
		const amount = 200n;

		(getIdleMargin as jest.Mock).mockReturnValueOnce({
			positions: [
				{
					market: '0x1',
					idleMargin: 100n,
				},
				{
					market: '0x2',
					idleMargin: 30n,
				},
				{
					market: '0x3',
					idleMargin: 70n,
				},
				{
					market: '0x4',
					idleMargin: 250n,
				},
			],
		});

		const expectedResult: IdlePosition[] = [
			{
				market: '0x4',
				idleMargin: 250n,
			},
		];

		const result = selectPositionsForWidthdraw([], amount);

		expect(result).toEqual(expectedResult);
	});

	test('should throw error if idle margin is not enough to cover amount', () => {
		const amount = 200n;

		(getIdleMargin as jest.Mock).mockReturnValueOnce({
			idleInMarkets: 180n,
			positions: [
				{
					market: '0x1',
					idleMargin: 100n,
				},
				{
					market: '0x2',
					idleMargin: 30n,
				},
				{
					market: '0x3',
					idleMargin: 50n,
				},
			],
		});

		expect(() => selectPositionsForWidthdraw([], amount)).toThrowError('Not enough idle margin');
	});

	test('should throw error if there is no idle margin', () => {
		const amount = 200n;

		(getIdleMargin as jest.Mock).mockReturnValueOnce({
			idleInMarkets: 0n,
			positions: [],
		});

		expect(() => selectPositionsForWidthdraw([], amount)).toThrowError('Not enough idle margin');
	});

	test('should return all positions when total idleMargin exactly equals the amount', () => {
		const amount = 200n;

		(getIdleMargin as jest.Mock).mockReturnValueOnce({
			positions: [
				{
					market: '0x1',
					idleMargin: 100n,
				},
				{
					market: '0x2',
					idleMargin: 50n,
				},
				{
					market: '0x3',
					idleMargin: 50n,
				},
			],
		});

		const result = selectPositionsForWidthdraw([], amount);

		// Check the total idleMargin in the result
		const totalIdleMargin = result.reduce((acc, position) => acc + position.idleMargin, 0n);
		expect(totalIdleMargin).toEqual(amount);

		// Check the number of selected positions
		expect(result).toHaveLength(3);
	});

	test('should correctly select multiple positions when amount is covered by their combined idleMargins', () => {
		const amount = 120n;

		(getIdleMargin as jest.Mock).mockReturnValueOnce({
			positions: [
				{
					market: '0x1',
					idleMargin: 50n,
				},
				{
					market: '0x2',
					idleMargin: 40n,
				},
				{
					market: '0x3',
					idleMargin: 30n,
				},
				{
					market: '0x4',
					idleMargin: 20n,
				},
			],
		});

		const result = selectPositionsForWidthdraw([], amount);

		// Check the total idleMargin in the result
		const totalIdleMargin = result.reduce((acc, position) => acc + position.idleMargin, 0n);
		expect(totalIdleMargin).toEqual(amount);

		// Check the number of selected positions
		expect(result).toHaveLength(3);
	});
});
