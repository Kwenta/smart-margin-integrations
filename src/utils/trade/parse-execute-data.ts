import type { Hex } from 'viem';
import { decodeAbiParameters, parseAbiParameters } from 'viem';

import { commandsAbis, commandsToNames } from '../../constants/commands';

interface ExecuteOperation {
	commandName: string;
	decodedArgs: readonly unknown[];
}

function parseExecuteData(data: readonly [readonly number[], readonly Hex[]]): ExecuteOperation[] {
	const res = [];
	for (let i = 0; i < data.at(0)!.length; i++) {
		const command = data[0][i];
		const args = data[1][i];

		const commandName = commandsToNames[command];
		const commandArgs = commandsAbis[command];
		const decodedArgs = decodeAbiParameters(parseAbiParameters(commandArgs), args);
		// eslint-disable-next-line no-console
		console.log({ commandName, decodedArgs });
		res.push({ commandName, decodedArgs });
	}

	return res;
}

export { parseExecuteData };
export type { ExecuteOperation };
