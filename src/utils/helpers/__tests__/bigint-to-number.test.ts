import { formatUnits } from 'viem';

import { bigintToNumber } from '../bigint-to-number';

describe('bigintToNumber', () => {
	test('should correctly convert bigint to number', () => {
		const value = BigInt(10);
		const decimals = 6;
		const expectedResult = 0.00001;

		const result = bigintToNumber(value, decimals);

		expect(result).toEqual(expectedResult);
	});

	test('should correctly convert bigint to number with default decimal value', () => {
		const value = BigInt(10);
		const decimals = 18; // This is your default value
		const expectedResult = Number.parseFloat(formatUnits(value, decimals));

		const result = bigintToNumber(value); // We do not pass decimals here to test default

		expect(result).toEqual(expectedResult);
	});
});
