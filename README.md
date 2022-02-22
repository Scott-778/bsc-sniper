# BSC Sniper

Sniper bot that buys new BSC tokens when liquidity is locked. This bot gets notifications from BSC SAFE Sniper Channel on Telegram and buys that token.
https://t.me/bscsafesniper

Turn on Two step verification in telegram. Go to my.telegram.org and create App to get api_id and api_hash. You need to install nodejs from nodejs.org, the lastest LTS Version. Use at your own risk. Investing in cryptocurrency is risky not financial advice. If you can code and want to make this project better please feel free to contribute. There is a small 0.7% buying fee per buy. This is to help me buy a cup of coffee and support for this project.

Join my telegram group where we can talk about this project, tokens and the best strategies. https://t.me/CoinMarketCapSniperBot

Important! If you have an issue please don't post screenshots with personal information like seed phrase, telephone number, Telegram code, Telegram two factor password, or Telegram string session. Please keep that information private!

## Getting Started

First, if you don't have node.js installed go to nodejs.org and install the lastest LTS version.
Then go to my.telegram.org and create an app to get apiID and apiHash.
Then subscribe to this channel on Telegram https://t.me/bscsafesniper
Then Use the following commands either in VScode or command prompt 
```
git clone https://github.com/Scott-778/bsc-sniper.git
```
```
cd bsc-sniper
```
```
npm install
```
Then edit .env file with your bsc wallet address, mnemonic, apiId and apiHash in your code editor and save file.

To start bot run this command
```
node bscBot.js
```
