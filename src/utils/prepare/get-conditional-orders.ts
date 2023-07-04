import type { Address, ReadContractReturnType } from 'viem';

import { SMART_MARGIN_ACCOUNT_ABI } from '../../abi';
import { initClients } from '../../config';
import { bigintToNumber } from '../helpers';

const ORDERS_FETCH_SIZE = 500n;

interface OrdersResponse
	extends ReadContractReturnType<typeof SMART_MARGIN_ACCOUNT_ABI, 'getConditionalOrder'> {
	index: bigint;
}

async function getConditionalOrders(address: Address) {
	const { publicClient } = initClients();
	const orders: OrdersResponse[] = [];

	const lastOrderId = await publicClient.readContract({
		abi: SMART_MARGIN_ACCOUNT_ABI,
		address,
		functionName: 'conditionalOrderId',
	});

	if (lastOrderId === 0n) {
		return orders;
	}

	const start = lastOrderId > ORDERS_FETCH_SIZE ? lastOrderId - ORDERS_FETCH_SIZE : 0n;

	const config = {
		abi: SMART_MARGIN_ACCOUNT_ABI,
		address,
		functionName: 'getConditionalOrder',
	};

	const arrLength = bigintToNumber(lastOrderId - start, 0);

	const contracts = Array(arrLength)
		.fill(null)
		.map((_, i) => ({
			...config,
			args: [start + BigInt(i)],
		}));

	const ordersResponse = (await publicClient.multicall({
		contracts,
		allowFailure: false,
	})) as OrdersResponse[];

	ordersResponse
		.map((order, index) => ({
			...order,
			index: start + BigInt(index),
		}))
		.filter((order) => order.targetPrice > 0n)
		.forEach((order) => {
			orders.push(order);
		});

	return orders;
}

export { getConditionalOrders };
