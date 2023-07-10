import type { Hex } from 'viem';
import { decodeAbiParameters, parseAbiParameters } from 'viem';

import { commandsAbis, commandsToNames } from '../../../constants/commands';
import { parseExecuteData } from '../parse-execute-data';

jest.mock('viem', () => ({
	decodeAbiParameters: jest.fn(),
	parseAbiParameters: jest.fn(),
}));

beforeEach(() => {
	jest.clearAllMocks();
});

describe('parseExecuteData', () => {
	test('should correctly parse execute data', () => {
		const commandIndex = 0;
		const commandName = commandsToNames[commandIndex];
		const commandArgs = commandsAbis[commandIndex];
		const hexData = '0x1234';

		(decodeAbiParameters as jest.Mock).mockReturnValueOnce(['decoded']);
		(parseAbiParameters as jest.Mock).mockReturnValueOnce(['parsed']);

		const result = parseExecuteData([[commandIndex], [hexData]]);

		expect(result).toEqual([
			{
				commandName,
				decodedArgs: ['decoded'],
			},
		]);
		expect(parseAbiParameters).toHaveBeenCalledWith(commandArgs);
		expect(decodeAbiParameters).toHaveBeenCalledWith(['parsed'], hexData);
	});

	test('should correctly parse multiple execute data', () => {
		const commandIndexes = [0, 1];
		const hexDatas: readonly Hex[] = ['0x1234', '0x5678'];

		const commandNames = commandIndexes.map((index) => commandsToNames[index]);
		const commandArgs = commandIndexes.map((index) => commandsAbis[index]);

		(decodeAbiParameters as jest.Mock)
			.mockReturnValueOnce(['decoded1'])
			.mockReturnValueOnce(['decoded2']);
		(parseAbiParameters as jest.Mock)
			.mockReturnValueOnce(['parsed1'])
			.mockReturnValueOnce(['parsed2']);

		const result = parseExecuteData([commandIndexes, hexDatas]);

		expect(result).toEqual([
			{
				commandName: commandNames[0],
				decodedArgs: ['decoded1'],
			},
			{
				commandName: commandNames[1],
				decodedArgs: ['decoded2'],
			},
		]);

		expect(parseAbiParameters).toHaveBeenNthCalledWith(1, commandArgs[0]);
		expect(parseAbiParameters).toHaveBeenNthCalledWith(2, commandArgs[1]);
		expect(decodeAbiParameters).toHaveBeenNthCalledWith(1, ['parsed1'], hexDatas[0]);
		expect(decodeAbiParameters).toHaveBeenNthCalledWith(2, ['parsed2'], hexDatas[1]);
	});
});
