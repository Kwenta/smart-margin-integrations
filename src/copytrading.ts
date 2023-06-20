import { initClients } from './config';

const { publicClient, walletClient } = initClients();

const unwatch = publicClient.watchBlocks({
	onBlock: (block) => {
		console.log('block', block.number);
	},
	pollingInterval: 1500,
});
