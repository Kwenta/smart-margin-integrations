import type { IdlePosition } from './get-idle-margin';

function selectPositionsForWidthdraw(positions: IdlePosition[], amount: bigint): IdlePosition[] {
	const sortedPositions = positions.sort((a, b) => (b.idleMargin > a.idleMargin ? 1 : -1));

	const selectedPositions: IdlePosition[] = [];
	let remainingAmount = amount;

	for (const position of sortedPositions) {
		selectedPositions.push(position);
		remainingAmount -= position.idleMargin;

		if (remainingAmount <= 0n) {
			break;
		}
	}

	return selectedPositions;
}

export { selectPositionsForWidthdraw };
