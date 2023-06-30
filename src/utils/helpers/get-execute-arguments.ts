function getExecuteArguments(): Record<string, string> {
	const args: string[] = process.argv.slice(2);
	const result: Record<string, string> = {};

	for (let i = 0; i < args.length; i += 2) {
		const key: string = args[i].replace(/^--/, '');
		const nextArg: string = args[i + 1];

		if (nextArg !== undefined && !nextArg.startsWith('--')) {
			result[key] = nextArg;
		}
	}

	return result;
}

export { getExecuteArguments };
