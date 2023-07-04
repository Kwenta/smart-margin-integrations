import type { PositionDetail } from '../prepare';

function isShortPosition(position: PositionDetail): boolean {
	return position.position.size < 0n;
}

export { isShortPosition };
