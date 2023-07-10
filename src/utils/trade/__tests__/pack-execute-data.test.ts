import { encodeAbiParameters, encodeFunctionData, parseAbiParameters } from 'viem';

import { SMART_MARGIN_ACCOUNT_ABI } from '../../../abi';
import { commandsAbis, commandsToNames } from '../../../constants/commands';
import { packExecuteData } from '../pack-execute-data';

jest.mock('viem', () => ({
	encodeAbiParameters: jest.fn(),
	encodeFunctionData: jest.fn(),
	parseAbiParameters: jest.fn(),
}));

beforeEach(() => {
	jest.clearAllMocks();
	(encodeAbiParameters as jest.Mock).mockImplementation(
		(commandArgs, decodedArgs) => `${commandArgs}-${decodedArgs}`
	);
	(encodeFunctionData as jest.Mock).mockReturnValue('EncodedFunctionData');
	(parseAbiParameters as jest.Mock).mockImplementation((commandArgs) => commandArgs);
});

describe('packExecuteData', () => {
	test('should correctly encode the execute data', () => {
		const operations = [
			{
				commandName: commandsToNames[2],
				decodedArgs: ['arg1', 'arg2'],
			},
			{
				commandName: commandsToNames[3],
				decodedArgs: ['arg3', 'arg4'],
			},
		];

		const result = packExecuteData(operations);

		expect(result).toBe('EncodedFunctionData');
		expect(encodeAbiParameters).toHaveBeenCalledTimes(2);
		expect(encodeFunctionData).toHaveBeenCalledWith({
			abi: SMART_MARGIN_ACCOUNT_ABI,
			functionName: 'execute',
			args: [
				[2, 3],
				[
					`${commandsAbis[2]}-${operations[0].decodedArgs}`,
					`${commandsAbis[3]}-${operations[1].decodedArgs}`,
				],
			],
		});
	});

	test('should skip owner only commands while encoding the execute data', () => {
		const operations = [
			{
				commandName: commandsToNames[0], // Owner only command
				decodedArgs: ['arg1', 'arg2'],
			},
			{
				commandName: commandsToNames[2],
				decodedArgs: ['arg3', 'arg4'],
			},
		];

		const result = packExecuteData(operations);

		expect(result).toBe('EncodedFunctionData');
		expect(encodeAbiParameters).toHaveBeenCalledTimes(1);
		expect(encodeFunctionData).toHaveBeenCalledWith({
			abi: SMART_MARGIN_ACCOUNT_ABI,
			functionName: 'execute',
			args: [[2], [`${commandsAbis[2]}-${operations[1].decodedArgs}`]],
		});
	});

	test('should handle empty operations array correctly', () => {
		const result = packExecuteData([]);

		expect(result).toBe('EncodedFunctionData');
		expect(encodeAbiParameters).not.toHaveBeenCalled();
		expect(encodeFunctionData).toHaveBeenCalledWith({
			abi: SMART_MARGIN_ACCOUNT_ABI,
			functionName: 'execute',
			args: [[], []],
		});
	});
});
