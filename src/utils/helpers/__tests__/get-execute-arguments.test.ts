import { getExecuteArguments } from '../get-execute-arguments';

describe('getExecuteArguments', () => {
	const originalProcessArgv = process.argv;

	afterEach(() => {
		process.argv = originalProcessArgv; // restore original process.argv after each test
	});

	test('should correctly parse command line arguments', () => {
		process.argv = ['node', 'script.js', '--arg1', 'value1', '--arg2', 'value2'];

		const expectedResult = {
			arg1: 'value1',
			arg2: 'value2',
		};

		const result = getExecuteArguments();

		expect(result).toEqual(expectedResult);
	});

	test('should ignore arguments without values', () => {
		process.argv = ['node', 'script.js', '--arg1', 'value1', '--arg2'];

		const expectedResult = {
			arg1: 'value1',
		};

		const result = getExecuteArguments();

		expect(result).toEqual(expectedResult);
	});

	test('should ignore values that look like arguments', () => {
		process.argv = ['node', 'script.js', '--arg1', '--value1', '--arg2', 'value2'];

		const expectedResult = {
			arg2: 'value2',
		};

		const result = getExecuteArguments();

		expect(result).toEqual(expectedResult);
	});

	test('should return empty object if no arguments are passed', () => {
		process.argv = ['node', 'script.js'];

		const expectedResult = {};

		const result = getExecuteArguments();

		expect(result).toEqual(expectedResult);
	});
});
