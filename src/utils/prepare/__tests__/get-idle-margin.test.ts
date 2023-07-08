import { getIdleMargin } from '../get-idle-margin';
import type { PositionDetail } from '../get-positions';

const MOCK_POSITION: PositionDetail = {
	position: {
		id: 203n,
		lastFundingIndex: 1342n,
		margin: 150606293231765512034n,
		lastPrice: 30126162393451675007159n,
		size: 0n,
	},
	notionalValue: -573201424000000000000n,
	profitLoss: -804338524418174863n,
	accruedFunding: 2823390133630333282n,
	remainingMargin: 152625344840977670453n,
	accessibleMargin: 112624344840977670453n,
	liquidationPrice: 37764283316200258971205n,
	canLiquidatePosition: false,
	market: {
		key: '0x7342544350455250000000000000000000000000000000000000000000000000',
		market: '0xd5844EA3701a4507C27ebc5EBA733E1Aa2915B31',
	},
};

describe('getIdleMargin', () => {
	it('should correctly calculate idle margin and return positions with idle margin', () => {
		const positions = [{ ...MOCK_POSITION, position: { ...MOCK_POSITION.position, size: 0n } }];

		const result = getIdleMargin(positions);

		expect(result.idleInMarkets).toBe(152625344840977670453n);
		expect(result.positions).toEqual([
			{
				market: '0xd5844EA3701a4507C27ebc5EBA733E1Aa2915B31',
				idleMargin: 152625344840977670453n,
			},
		]);
	});

	it('should return idleInMarkets as 0 and empty positions array when there are no idle positions', () => {
		const positions = [
			{
				...MOCK_POSITION,
				position: { ...MOCK_POSITION.position, size: -1n }, // size is not 0n
				remainingMargin: 0n, // remainingMargin is not > 0n
			},
		];

		const result = getIdleMargin(positions);

		expect(result.idleInMarkets).toBe(0n);
		expect(result.positions).toEqual([]);
	});

	it('should return idleInMarkets as 0 and empty positions array when positions array is empty', () => {
		const positions: PositionDetail[] = [];

		const result = getIdleMargin(positions);

		expect(result.idleInMarkets).toBe(0n);
		expect(result.positions).toEqual([]);
	});

	it('should correctly calculate idle margin when positions array has both idle and non-idle positions', () => {
		const positions: PositionDetail[] = [
			{ ...MOCK_POSITION }, // idle position
			{
				...MOCK_POSITION,
				market: { market: '0x', key: '0x' },
				position: { ...MOCK_POSITION.position, size: -1n },
				remainingMargin: 0n,
			}, // non-idle position
		];

		const result = getIdleMargin(positions);

		expect(result.idleInMarkets).toBe(MOCK_POSITION.remainingMargin);
		expect(result.positions).toEqual([
			{
				market: MOCK_POSITION.market.market,
				idleMargin: MOCK_POSITION.remainingMargin,
			},
		]);
	});
});
