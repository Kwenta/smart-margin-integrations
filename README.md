# Copytrading example service for Kwenta Smart Margin

This service is an illustrative example of how you can construct delegation services for Kwenta Smart Margin using viem. The service allows you to replicate trades from a target wallet to a repeater wallet, allowing automated trading in proportion to the target wallet's activities. This is ideal for traders who wish to automate their trading strategies or follow the trades of another user.

## Pre-requisites

- [Node.js v16](https://nodejs.org/en) or higher
- Executor wallet with some ETH for gas fees.
- A Smart Margin account with a delegate executor [see FAQ](#smart-margin-faq).
– JSON-RPC URL for the chain you are using.
  You can use public RPC nodes from [Chainlist](https://chainlist.org/), but we recommend running your own node for extended rate limits and security reasons.

## How it works

1. User add delegate EOA to his Smart Margin account.
2. User run this service with his delegate EOA and target and repeater Smart Margin account addresses.
3. Service will listen for new trades on target Smart Margin account and execute them on repeater Smart Margin account.
4. Service works with amount proportions. If target wallet has 1000 sUSD, and repeater wallet has 500 sUSD, service will execute all of trades with 50% from target sizes.
5. Service will execute trades only if target wallet has enough sUSD to execute trade.
6. Service can copy open/close trades, modify margin, modify size, set stop loss and take profit conditional orders.

## Installation

```bash
npm install
```

## Usage

First, you need to create a `.env` file with the following variables:

```bash
CHAIN_ID= # 10 for Optimism Mainnet, 420 for Optimism Goerli
JSON_RPC_URL= # JSON RPC URL for the chain you are using
EXECUTOR_PRIVATE_KEY= # Private key of the EOA wallet that will execute the transactions
```

It's good practice to **use a separate wallet** for transactions, but you need to have some ETH on it for gas fees and add the wallet as a `delegate` to your Smart Margin account.

Read [Smart Margin FAQ](#smart-margin-faq) above for more details.

---

Then, you can run the scripts with following arguments:

```bash
  npm run copytrading -- --target <target-smart-address> --repeater <repeater-smart-address>
```

## Smart Margin FAQ

### What is Smart Margin?

You can read more about Smart Margin in [Kwenta DOCS](https://docs.kwenta.io/using-kwenta/smart-margin).

### How i can get my smart margin account address?

1. Go to Smart Margin Factory in explorer. [Optimism mainnet](https://optimistic.etherscan.io/address/0x8234f990b149ae59416dc260305e565e5dafeb54#readContract), [Optimism Goerli]()
2. Open **Read Contract** tab and call `getAccountsOwnedBy` function with your wallet address as an argument.

![getAccountsOwnedBy](./assets/get-smart-margin.jpeg?raw=true)

### How i can add a delegate to my smart margin account?

1. Go to Smart Margin account in explorer (you can find it in [Smart Margin Factory](#how-i-can-get-my-smart-margin-account-address)).
2. If your contract doesn't have methods, you need to open tab **Code** and Click on **More Options** and select **Is this a proxy?** to confirm and enable the "Read as Proxy" & "Write as Proxy" tabs.
3. Connect to your owner wallet (not delegate wallet).
4. Open **Write as Proxy** tab and call `addDelegate` function with your delegate address as an argument.
5. After transaction is confirmed, you can check your delegate in **Read as Proxy** tab and call `delegates` function.

![addDelegate](./assets/add-delegate.jpeg?raw=true)

### How i can remove a delegate from my smart margin account?

1. Go to Smart Margin account in explorer (you can find it in [Smart Margin Factory](#how-i-can-get-my-smart-margin-account-address)).
2. If your contract doesn't have methods, you need to open tab **Code** and Click on **More Options** and select **Is this a proxy?** to confirm and enable the "Read as Proxy" & "Write as Proxy" tabs.
3. Connect to your owner wallet (not delegate wallet).
4. Open **Write as Proxy** tab and call `addDelegate` function with your delegate address as an argument.
5. After transaction is confirmed, you can check your delegate in **Read as Proxy** tab and call `delegates` function.

---

<p style="text-align: center; font-weight:bold;">Powered by <a href="https://kwenta.eth.limo/">Kwenta</a></p>
