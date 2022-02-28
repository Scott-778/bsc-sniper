/** 
 * Buys tokens when we recieve notification that liquidity is locked from BSC safe sniper telegram channel 
 * 
 * Join this telegram channel https://t.me/bscsafesniper
 * 
 * Be careful with this one lots of tokens could be scams!
 *  
 * Not financial advice
 * 
 * use at your own risk
 * 
 * **/

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const { NewMessage } = require('telegram/events');
const ethers = require('ethers');
require('dotenv').config();

const addresses = {
	WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
	pancakeRouter: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
	BUSD: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
	buyContract: '0xDC56800e179964C3C00a73f73198976397389d26',

	recipient: process.env.recipient
}

/*-----------Settings-----------*/
const mnemonic = process.env.mnemonic;
const apiId = parseInt(process.env.apiId);
const apiHash = process.env.apiHash;
const stringSession = new StringSession(process.env.stringSession);

const numberOfTokensToBuy = 10; // number of different tokens you want to buy
const autoSell = true;  // If you want to auto sell or not 

const myGasPriceForApproval = ethers.utils.parseUnits('6', 'gwei');
const myGasLimit = 1500000;

const BUYALLTOKENS = true;

/* Strategy for buying all tokens (BA)*/
const buyAllTokensStrategy = {

	investmentAmount: '0.1', // Amount to invest per token in BNB
	gasPrice: ethers.utils.parseUnits('6', 'gwei'),
	profitPercent: 100,      // 100% profit
	stopLossPercent: 10,  // 10% loss
	percentOfTokensToSellProfit: 75, // sell 75% when profit is reached
	percentOfTokensToSellLoss: 100, // sell 100% when stoploss is reached 
	trailingStopLossPercent: 15 // 15% trailing stoploss
}

/* Strategy for buying low-liquid tokens (LL) */
const strategyLL =
{
	investmentAmount: '0.1', 	// Investment amount per token
	maxBuyTax: 10, 			// max buy tax
	minBuyTax: 0,			// min buy tax
	maxSellTax: 10,			// max sell tax
	maxLiquidity: 150,	        // max Liquidity BNB
	minLiquidity: 1, 	  	// min Liquidity BNB
	profitPercent: 250,          // 2.5X
	stopLossPercent: 30,        // 30% loss
	platform: "COINMARKETCAP",      // Either COINMARKETCAP or COINGECKO
	gasPrice: ethers.utils.parseUnits('6', 'gwei'), // Gas Price. Higher is better for low liquidity
	percentOfTokensToSellProfit: 75, // sell 75% when profit is reached
	percentOfTokensToSellLoss: 100, // sell 100% when stoploss is reached 
	trailingStopLossPercent: 10 // % trailing stoploss
}

/* Strategy for buying medium-liquid tokens (ML) */
const strategyML =
{
	investmentAmount: '0.2', 	// Investment amount per token
	maxBuyTax: 11,           	 // max buy tax
	minBuyTax: 2,			// min buy tax
	maxSellTax: 11,			// max sell tax
	maxLiquidity: 300,	        // max Liquidity BNB
	minLiquidity: 150, 	  	// min Liquidity BNB
	profitPercent: 80,          // 80% profit
	stopLossPercent: 20,        // 20% loss
	platform: "COINMARKETCAP",          // Either COINMARKETCAP or COINGECKO
	gasPrice: ethers.utils.parseUnits('6', 'gwei'),
	percentOfTokensToSellProfit: 75, // sell 75% when profit is reached
	percentOfTokensToSellLoss: 100, // sell 100% when stoploss is reached
	trailingStopLossPercent: 10 // % trailing stoploss
}

/* Strategy for buying high-liquid tokens (HL)*/
const strategyHL =
{
	investmentAmount: '0.2', 	// Investment amount per token
	maxBuyTax: 11,            	// max buy tax
	minBuyTax: 0,			// min buy tax
	maxSellTax: 11,			// max sell tax
	maxLiquidity: 700,	   	// max Liquidity BNB
	minLiquidity: 300, 	  	// min Liquidity BNB
	profitPercent: 50,          // 50% profit
	stopLossPercent: 10,        // 10% loss
	platform: "COINMARKETCAP",      // Either COINMARKETCAP or COINGECKO
	gasPrice: ethers.utils.parseUnits('6', 'gwei'),
	percentOfTokensToSellProfit: 75, // sell 75% of tokens when profit is reached
	percentOfTokensToSellLoss: 100, // sell 100% of tokens when stoploss is reached
	trailingStopLossPercent: 10 // % trailing stoploss
}
/*-----------End Settings-----------*/

const node = 'https://bsc-dataseed.binance.org/';
const wallet = new ethers.Wallet.fromMnemonic(mnemonic);
const provider = new ethers.providers.JsonRpcProvider(node);
const account = wallet.connect(provider);
const pancakeAbi = [
	'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
	'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)'
];
const pancakeRouter = new ethers.Contract(addresses.pancakeRouter, pancakeAbi, account);
let tokenAbi = [
	'function approve(address spender, uint amount) public returns(bool)',
	'function balanceOf(address account) external view returns (uint256)',
	'event Transfer(address indexed from, address indexed to, uint amount)',
	'function name() view returns (string)',
	'function buyTokens(address tokenAddress, address to) payable',
	'function decimals() external view returns (uint8)'
];
const channelId = 1459954937;
let token = [];
var sellCount = 0;
var buyCount = 0;
const buyContract = new ethers.Contract(addresses.buyContract, tokenAbi, account);
const version = 'v1.0';
async function buy() {
	if (buyCount < numberOfTokensToBuy) {
		const value = ethers.utils.parseUnits(token[buyCount].investmentAmount, 'ether').toString();
		const tx = await buyContract.buyTokens(token[buyCount].tokenAddress, addresses.recipient,
			{
				value: value,
				gasPrice: token[buyCount].gasPrice,
				gasLimit: myGasLimit

			});
		const receipt = await tx.wait();
		console.log(receipt);
		token[buyCount].didBuy = true;
		buyCount++;
		approve();
	}

}

async function approve() {
	let contract = token[buyCount - 1].contract;
	const valueToApprove = ethers.constants.MaxUint256;
	const tx = await contract.approve(
		pancakeRouter.address,
		valueToApprove, {
		gasPrice: myGasPriceForApproval,
		gasLimit: 210000
	}
	);
	const receipt = await tx.wait();
	console.log(receipt);
	if (autoSell) {
		token[buyCount - 1].checkProfit();
	} else {
		if (buyCount == numberOfTokensToBuy) {
			process.exit();
		}
	}

}

/**
 * 
 * Check for profit
 * 
 * */
async function getCurrentValue(token) {
	let bal = await token.contract.balanceOf(addresses.recipient);
	const amount = await pancakeRouter.getAmountsOut(bal, token.sellPath);
	let currentValue = amount[1];
	return currentValue;
}
async function setInitialStopLoss(token) {
	token.intitialValue = await getCurrentValue(token);
	token.newValue = token.intitialValue;
	token.stopLoss = ethers.utils.parseUnits((parseFloat(ethers.utils.formatUnits( token.intitialValue)) - parseFloat(ethers.utils.formatUnits( token.intitialValue)) * (token.stopLossPercent / 100)).toFixed(18).toString());
}

async function setNewStopLoss(token) {
	token.newValue = token.currentValue;
	// new stop loss equals old stop loss * trailing stop loss percent + old stop loss 
	token.stopLoss = ethers.utils.parseUnits((parseFloat(ethers.utils.formatUnits(token.stopLoss)) * (token.trailingStopLossPercent / 100 ) + parseFloat(ethers.utils.formatUnits(token.stopLoss))).toFixed(18).toString());
}
async function checkForProfit(token) {
	var sellAttempts = 0;
	await setInitialStopLoss(token);
	token.contract.on("Transfer", async (from, to, value, event) => {
		const tokenName = await token.contract.name();
		let currentValue = await getCurrentValue(token);
		token.currentValue = currentValue;
		const takeProfit = (parseFloat(ethers.utils.formatUnits(token.intitialValue)) * (token.profitPercent + token.tokenSellTax) / 100 + parseFloat(ethers.utils.formatUnits(token.intitialValue))).toFixed(18).toString();
		const profitDesired = ethers.utils.parseUnits(takeProfit);
		let targetValueToSetNewStopLoss = ethers.utils.parseUnits((parseFloat(ethers.utils.formatUnits(token.newValue)) * (token.trailingStopLossPercent / 100 + token.tokenSellTax / 100) + parseFloat(ethers.utils.formatUnits(token.newValue))).toFixed(18).toString());
		console.log(ethers.utils.formatUnits(targetValueToSetNewStopLoss));
		let stopLoss = token.stopLoss;

		// if current value is greater than targetValue, set a new stop loss
		if (currentValue.gt(targetValueToSetNewStopLoss) && token.trailingStopLossPercent > 0) {
			setNewStopLoss(token);
			console.log("Setting new stop loss");
		}
		let timeStamp = new Date().toLocaleString();
		const enc = (s) => new TextEncoder().encode(s);
		//process.stdout.write(enc(`${timeStamp} --- ${tokenName} --- Current Value in BNB: ${ethers.utils.formatUnits(currentValue)} --- Profit At: ${ethers.utils.formatUnits(profitDesired)} --- Stop Loss At: ${ethers.utils.formatUnits(stopLoss)} \r`));
		console.log(`${version} ${timeStamp} --- ${tokenName} --- Current Value in BNB: ${ethers.utils.formatUnits(currentValue)} --- Profit At: ${ethers.utils.formatUnits(profitDesired)} --- Stop Loss At: ${ethers.utils.formatUnits(token.stopLoss)}`);
		if (currentValue.gte(profitDesired)) {
			if (buyCount <= numberOfTokensToBuy && !token.didSell && token.didBuy && sellAttempts == 0) {
				sellAttempts++;
				console.log("Selling", tokenName, "now profit target reached", "\n");
				sell(token, true);
				token.contract.removeAllListeners();
			}
		}

		if (currentValue.lte(stopLoss)) {
			if (buyCount <= numberOfTokensToBuy && !token.didSell && token.didBuy && sellAttempts == 0) {
				sellAttempts++;
				console.log("Selling", tokenName, "now stoploss reached", "\n");
				sell(token, false);
				token.contract.removeAllListeners();
			}
		}
	});
}
async function sell(tokenObj, isProfit) {
	try {
		const bal = await tokenObj.contract.balanceOf(addresses.recipient);
		const decimals = await tokenObj.contract.decimals();
		var balanceString;
		if (isProfit) {
			balanceString = (parseFloat(ethers.utils.formatUnits(bal.toString(), decimals)) * (tokenObj.percentOfTokensToSellProfit / 100)).toFixed(decimals).toString();
		} else {
			balanceString = (parseFloat(ethers.utils.formatUnits(bal.toString(), decimals)) * (tokenObj.percentOfTokensToSellLoss / 100)).toFixed(decimals).toString();
		}
		const balanceToSell = ethers.utils.parseUnits(balanceString, decimals);
		const sellAmount = await pancakeRouter.getAmountsOut(balanceToSell, tokenObj.sellPath);
		const sellAmountsOutMin = sellAmount[1].sub(sellAmount[1].div(2));

		const tx = await pancakeRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
			sellAmount[0].toString(),
			0,
			tokenObj.sellPath,
			addresses.recipient,
			Math.floor(Date.now() / 1000) + 60 * 3, {
			gasPrice: myGasPriceForApproval,
			gasLimit: myGasLimit,

		}
		);
		const receipt = await tx.wait();
		console.log(receipt);
		sellCount++;
		token[tokenObj.index].didSell = true;

		if (sellCount == numberOfTokensToBuy) {
			console.log("All tokens sold");
			process.exit();
		}

	} catch (e) {

	}
}

(async () => {
	const client = new TelegramClient(stringSession, apiId, apiHash, {
		connectionRetries: 5,
	});
	await client.start({
		phoneNumber: async () => await input.text("number?"),
		password: async () => await input.text("password?"),
		phoneCode: async () => await input.text("Code?"),
		onError: (err) => console.log(err),
	});
	console.log("You should now be connected.", '\n');
	console.log(client.session.save(), '\n');
	client.addEventHandler(onNewMessage, new NewMessage({}));
	console.log("Waiting for telegram notification to buy...");

})();

async function onNewMessage(event) {
	const message = event.message;
	if (message.peerId.channelId == channelId) {
		const ms = message.message.replace(/\n/g, " ").replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g," ").split(" ");
        const msg = ms.filter(function(str){
        return /\S/.test(str)});
		var address = '';
		let d = new Date().toLocaleString();
		for (var i = 0; i < msg.length; i++) {
			if (ethers.utils.isAddress(msg[i])) {
				address = msg[i];
				console.log('Contract:', address);
                
			}
			if (msg[i] == "BNB") {
				var liquidity = parseFloat(msg[i - 1]);
				console.log('--- NEW TOKEN FOUND ---');
				console.log('Liquidity:', liquidity, 'BNB');
			}
			if (msg[i] == "Buy:" && msg[i - 1] != "Max" ) {
				var slipBuy = parseInt(msg[i + 1]);
				console.log('Buy tax: ', slipBuy, '%');
			}
			if (msg[i] == "Sell:") {
				var slipSell = parseInt(msg[i + 1]);
				console.log('Sell tax:', slipSell, '%');
				console.log('--- --------------- ---');
			}
		}
        
		if (BUYALLTOKENS == false) {
			// Buy low-liquid tokens
			if (liquidity < strategyLL.maxLiquidity &&
				liquidity > strategyLL.minLiquidity &&
				slipBuy < strategyLL.maxTax &&
				slipSell < strategyLL.maxTax &&
				msg.includes("BNB") && msg.includes("Audit") && msg.includes("Report")) {

				token.push({
					tokenAddress: address,
					didBuy: false,
					hasSold: false,
					tokenSellTax: slipSell,
					tokenLiquidityType: 'BNB',
					tokenLiquidityAmount: liquidity,
					buyPath: [addresses.WBNB, address],
					sellPath: [address, addresses.WBNB],
					contract: new ethers.Contract(address, tokenAbi, account),
					index: buyCount,
					investmentAmount: strategyLL.investmentAmount,
					profitPercent: strategyLL.profitPercent,
					stopLossPercent: strategyLL.stopLossPercent,
					gasPrice: strategyLL.gasPrice,
					checkProfit: function () { checkForProfit(this); },
					percentOfTokensToSellProfit: strategyLL.percentOfTokensToSellProfit,
					percentOfTokensToSellLoss: strategyLL.percentOfTokensToSellLoss,
					initialTrailingStopLossPercent: strategyLL.trailingStopLossPercent,
					trailingStopLossPercent: strategyLL.trailingStopLossPercent,
					stopLoss: 0,
					intitialValue: 0,
					newValue: 0,
					currentValue: 0
					});
				console.log('<<< Attention! Buying token now! >>> Contract:', address);
				buy();

			}
			// Buy medium-liquid tokens
			else if (liquidity < strategyML.maxLiquidity &&
				liquidity > strategyML.minLiquidity &&
				slipBuy < strategyML.maxTax &&
				slipSell < strategyML.maxTax && 
				msg.includes("BNB") && msg.includes("Audit") && msg.includes("Report")) {

				token.push({
					tokenAddress: address,
					didBuy: false,
					hasSold: false,
					tokenSellTax: slipSell,
					tokenLiquidityType: 'BNB',
					tokenLiquidityAmount: liquidity,
					buyPath: [addresses.WBNB, address],
					sellPath: [address, addresses.WBNB],
					contract: new ethers.Contract(address, tokenAbi, account),
					index: buyCount,
					investmentAmount: strategyML.investmentAmount,
					profitPercent: strategyML.profitPercent,
					stopLossPercent: strategyML.stopLossPercent,
					gasPrice: strategyML.gasPrice,
					checkProfit: function () { checkForProfit(this); },
					percentOfTokensToSellProfit: strategyML.percentOfTokensToSellProfit,
					percentOfTokensToSellLoss: strategyML.percentOfTokensToSellLoss,
					initialTrailingStopLossPercent: strategyML.trailingStopLossPercent,
					trailingStopLossPercent: strategyML.trailingStopLossPercent,
					stopLoss: 0,
					intitialValue: 0,
					newValue: 0,
					currentValue: 0

				});
				console.log('<<< Attention! Buying token now! >>> Contract:', address);
				buy();

			}
			//Buy high-liquid tokens
			else if (liquidity < strategyHL.maxLiquidity &&
				liquidity > strategyHL.minLiquidity &&
				slipBuy < strategyHL.maxTax &&
				slipSell < strategyHL.maxTax &&
				msg.includes("BNB") && msg.includes("Audit") && msg.includes("Report")) {

				token.push({
					tokenAddress: address,
					didBuy: false,
					hasSold: false,
					tokenSellTax: slipSell,
					tokenLiquidityType: 'BNB',
					tokenLiquidityAmount: liquidity,
					buyPath: [addresses.WBNB, address],
					sellPath: [address, addresses.WBNB],
					contract: new ethers.Contract(address, tokenAbi, account),
					index: buyCount,
					investmentAmount: strategyHL.investmentAmount,
					profitPercent: strategyHL.profitPercent,
					stopLossPercent: strategyHL.stopLossPercent,
					gasPrice: strategyHL.gasPrice,
					checkProfit: function () { checkForProfit(this); },
					percentOfTokensToSellProfit: strategyHL.percentOfTokensToSellProfit,
					percentOfTokensToSellLoss: strategyHL.percentOfTokensToSellLoss,
					initialTrailingStopLossPercent: strategyHL.trailingStopLossPercent,
					trailingStopLossPercent: strategyHL.trailingStopLossPercent,
					stopLoss: 0,
					intitialValue: 0,
					newValue: 0,
					currentValue: 0
				});
				console.log('<<< Attention! Buying token now! >>> Contract:', address);
				buy();
			} else {
				console.log('Not buying this token does not match strategy! Waiting for telegram notification to buy...', '\n');
			}
		} else if (msg.includes("BNB") && msg.includes("Audit") && msg.includes("Report")) {
			// Buy all tokens no strategy
			token.push({
				tokenAddress: address,
				didBuy: false,
				hasSold: false,
				tokenSellTax: slipSell,
				tokenLiquidityType: 'BNB',
				tokenLiquidityAmount: liquidity,
				buyPath: [addresses.WBNB, address],
				sellPath: [address, addresses.WBNB],
				contract: new ethers.Contract(address, tokenAbi, account),
				index: buyCount,
				investmentAmount: buyAllTokensStrategy.investmentAmount,
				profitPercent: buyAllTokensStrategy.profitPercent,
				stopLossPercent: buyAllTokensStrategy.stopLossPercent,
				gasPrice: buyAllTokensStrategy.gasPrice,
				checkProfit: function () { checkForProfit(this); },
				percentOfTokensToSellProfit: buyAllTokensStrategy.percentOfTokensToSellProfit,
				percentOfTokensToSellLoss: buyAllTokensStrategy.percentOfTokensToSellLoss,
				initialTrailingStopLossPercent: buyAllTokensStrategy.trailingStopLossPercent,
				trailingStopLossPercent: buyAllTokensStrategy.trailingStopLossPercent,
				stopLoss: 0,
				intitialValue: 0,
				newValue: 0,
				currentValue: 0
			});
			console.log('<<< Attention! Buying token now! >>> Contract:', address);
			buy();
		} else {
			console.log('--- Not buying this token liquidity is not BNB or is it a promotional post marked "Promoted Token" ---');
		}
	}
}
