import { type Hex, encodeAbiParameters, encodeFunctionData, parseAbiParameters } from 'viem';

import { SMART_MARGIN_ACCOUNT_ABI } from '../../abi';
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

	return encodeFunctionData({
		abi: SMART_MARGIN_ACCOUNT_ABI,
		functionName: 'execute',
		args: [commands, args],
	});
}

export { packExecuteData };
