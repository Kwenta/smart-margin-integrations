import { type Hex, encodeAbiParameters, parseAbiParameters } from 'viem';

import { commandsAbis, commandsToNames } from '../../constants/commands';
import type { ExecuteOperation } from '../trade/parse-execute-data';

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

export { packExecuteData };
