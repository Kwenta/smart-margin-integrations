import type { Hex } from 'viem';
import { decodeAbiParameters, encodeAbiParameters, parseAbiParameters } from 'viem';

import { commandsAbis, commandsToNames } from '../constants/commands';

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

function packExecuteData(operations: ExecuteOperation[]) {
	const commands: number[] = [];
	const args: Hex[] = [];
	for (const { commandName, decodedArgs } of operations) {
		const command = Object.values(commandsToNames).findIndex((name) => name === commandName);

		if (command < 2) {
			// These commands only for owners. We don't want to allow them
			continue;
		}

		commands.push(command);
		const commandArgs = commandsAbis[command];
		const encodedArgs = encodeAbiParameters(parseAbiParameters(commandArgs), decodedArgs);
		args.push(encodedArgs);
	}

	return [commands, args];
}

export { parseExecuteData, packExecuteData };
