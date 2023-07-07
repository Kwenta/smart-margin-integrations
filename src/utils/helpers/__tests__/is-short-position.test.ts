import type { PositionDetail } from '../../prepare';

import { isShortPosition } from '../is-short-position'; // replace with actual path to your file

const MOCK_POSITION: PositionDetail = {
	position: {
		id: 203n,
		lastFundingIndex: 1342n,
		margin: 150606293231765512034n,
		lastPrice: 30126162393451675007159n,
		size: -19000000000000000n,
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

describe('isShortPosition', () => {
	test('should return true for negative position size', () => {
		const position: PositionDetail = {
			...MOCK_POSITION,
		};

		position.position.size = -1n;

		const result = isShortPosition(position);

		expect(result).toBe(true);
	});

	test('should return false for zero position size', () => {
		const position: PositionDetail = {
			...MOCK_POSITION,
		};

		position.position.size = 0n;

		const result = isShortPosition(position);

		expect(result).toBe(false);
	});

	test('should return false for positive position size', () => {
		const position: PositionDetail = {
			...MOCK_POSITION,
		};

		position.position.size = 1n;

		const result = isShortPosition(position);

		expect(result).toBe(false);
	});
});
