const commandsAbis: Record<number, string> = {
	0: 'int256 amount',
	1: 'uint256 amount',
	2: 'address market, int256 amount',
	3: 'address market',
	4: 'address market, int256 sizeDelta, uint256 desiredFillPrice',
	5: 'address market, int256 sizeDelta, uint256 desiredTimeDelta, uint256 desiredFillPrice',
	6: 'address market, int256 sizeDelta, uint256 desiredFillPrice',
	7: 'address market, uint256 desiredFillPrice',
	8: 'address market, uint256 desiredTimeDelta, uint256 desiredFillPrice',
	9: 'address market, uint256 desiredFillPrice',
	10: 'address market',
	11: 'address market',
	12: 'bytes32 marketKey, int256 marginDelta, int256 sizeDelta, uint256 targetPrice, uint8 conditionalOrderType, uint128 desiredFillPrice, bool reduceOnly',
	13: 'uint256 orderId',
};

enum ConditionalOrderTypeEnum {
	LIMIT = 0,
	STOP = 1,
}

enum CommandName {
	ACCOUNT_MODIFY_MARGIN = 'ACCOUNT_MODIFY_MARGIN',
	ACCOUNT_WITHDRAW_ETH = 'ACCOUNT_WITHDRAW_ETH',
	PERPS_V2_MODIFY_MARGIN = 'PERPS_V2_MODIFY_MARGIN',
	PERPS_V2_WITHDRAW_ALL_MARGIN = 'PERPS_V2_WITHDRAW_ALL_MARGIN',
	PERPS_V2_SUBMIT_ATOMIC_ORDER = 'PERPS_V2_SUBMIT_ATOMIC_ORDER',
	PERPS_V2_SUBMIT_DELAYED_ORDER = 'PERPS_V2_SUBMIT_DELAYED_ORDER',
	PERPS_V2_SUBMIT_OFFCHAIN_DELAYED_ORDER = 'PERPS_V2_SUBMIT_OFFCHAIN_DELAYED_ORDER',
	PERPS_V2_CLOSE_POSITION = 'PERPS_V2_CLOSE_POSITION',
	PERPS_V2_SUBMIT_CLOSE_DELAYED_ORDER = 'PERPS_V2_SUBMIT_CLOSE_DELAYED_ORDER',
	PERPS_V2_SUBMIT_CLOSE_OFFCHAIN_DELAYED_ORDER = 'PERPS_V2_SUBMIT_CLOSE_OFFCHAIN_DELAYED_ORDER',
	PERPS_V2_CANCEL_DELAYED_ORDER = 'PERPS_V2_CANCEL_DELAYED_ORDER',
	PERPS_V2_CANCEL_OFFCHAIN_DELAYED_ORDER = 'PERPS_V2_CANCEL_OFFCHAIN_DELAYED_ORDER',
	GELATO_PLACE_CONDITIONAL_ORDER = 'GELATO_PLACE_CONDITIONAL_ORDER',
	GELATO_CANCEL_CONDITIONAL_ORDER = 'GELATO_CANCEL_CONDITIONAL_ORDER',
}

const commandsToNames: Record<number, CommandName> = {
	0: CommandName.ACCOUNT_MODIFY_MARGIN,
	1: CommandName.ACCOUNT_WITHDRAW_ETH,
	2: CommandName.PERPS_V2_MODIFY_MARGIN,
	3: CommandName.PERPS_V2_WITHDRAW_ALL_MARGIN,
	4: CommandName.PERPS_V2_SUBMIT_ATOMIC_ORDER,
	5: CommandName.PERPS_V2_SUBMIT_DELAYED_ORDER,
	6: CommandName.PERPS_V2_SUBMIT_OFFCHAIN_DELAYED_ORDER,
	7: CommandName.PERPS_V2_CLOSE_POSITION,
	8: CommandName.PERPS_V2_SUBMIT_CLOSE_DELAYED_ORDER,
	9: CommandName.PERPS_V2_SUBMIT_CLOSE_OFFCHAIN_DELAYED_ORDER,
	10: CommandName.PERPS_V2_CANCEL_DELAYED_ORDER,
	11: CommandName.PERPS_V2_CANCEL_OFFCHAIN_DELAYED_ORDER,
	12: CommandName.GELATO_PLACE_CONDITIONAL_ORDER,
	13: CommandName.GELATO_CANCEL_CONDITIONAL_ORDER,
};

const commandsValues = Object.values(commandsToNames);
const marketCommandNames = commandsValues.slice(4, 10);
const closePositionCommands = commandsValues.slice(7, 10);
const openPositionCommands = commandsValues.slice(4, 7);
const conditionalOrderCommands = commandsValues.slice(11);

function isMarketCommand(commandName: CommandName): boolean {
	return marketCommandNames.includes(commandName);
}

function isOpenPositionCommand(commandName: CommandName): boolean {
	return openPositionCommands.includes(commandName);
}

function isClosePositionCommand(commandName: CommandName): boolean {
	return closePositionCommands.includes(commandName);
}

function isSetupConditionalOrderCommand(commandName: CommandName): boolean {
	return commandName === commandsValues[12];
}

export {
	CommandName,
	ConditionalOrderTypeEnum,
	commandsAbis,
	commandsToNames,
	conditionalOrderCommands,
	commandsValues,
	closePositionCommands,
	openPositionCommands,
	marketCommandNames,
	isMarketCommand,
	isOpenPositionCommand,
	isClosePositionCommand,
	isSetupConditionalOrderCommand,
};
