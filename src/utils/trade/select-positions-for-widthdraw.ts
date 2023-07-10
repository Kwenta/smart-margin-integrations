import type { PositionDetail } from '../prepare';
import { getIdleMargin } from '../prepare';
import type { IdlePosition } from '../prepare/get-idle-margin';

function selectPositionsForWidthdraw(positions: PositionDetail[], amount: bigint): IdlePosition[] {
	const { positions: idlePositions, idleInMarkets } = getIdleMargin(positions);

	if (idleInMarkets < amount) {
		throw new Error('Not enough idle margin');
	}

	const sortedPositions = idlePositions.sort((a, b) => (b.idleMargin > a.idleMargin ? 1 : -1));

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
