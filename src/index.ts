import { Env, sendErrorEmail } from './email';
import { getAvailableBalance, placeMarketBuyOrder } from './exchange';

export default {
	// The main cron trigger handler
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		// ctx.waitUntil ensures the worker stays alive until the promise resolves
		ctx.waitUntil(executeDCA(env));
	},
	
	// Exposing fetch for easy local testing via `wrangler dev`
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			await executeDCA(env);
			return new Response("DCA execution completed successfully.", { status: 200 });
		} catch (error: any) {
			return new Response(`DCA execution failed: ${error.message}`, { status: 500 });
		}
	},
};

async function executeDCA(env: Env) {
	try {
		console.log("Starting DCA execution...");

		if (!env.BTC_DCA_AMOUNT || !env.ETH_DCA_AMOUNT) {
			throw new Error("Missing DCA amount configuration in environment variables.");
		}

		const btcAmount = parseFloat(env.BTC_DCA_AMOUNT);
		const ethAmount = parseFloat(env.ETH_DCA_AMOUNT);

		if (isNaN(btcAmount) || isNaN(ethAmount)) {
			throw new Error("Invalid DCA amounts specified in environment variables (must be numbers).");
		}

		const totalRequired = btcAmount + ethAmount;

		console.log(`Checking USD balance... (Required: $${totalRequired.toFixed(2)})`);
		const availableUsd = await getAvailableBalance(env, "USD");

		if (availableUsd < totalRequired) {
			const errorMsg = `Insufficient USD balance. Available: $${availableUsd.toFixed(2)}, Required: $${totalRequired.toFixed(2)}`;
			console.error(errorMsg);
			await sendErrorEmail(env, "Insufficient Funds", errorMsg);
			return;
		}

		console.log(`Executing BTC-USD market buy for $${btcAmount.toFixed(2)}...`);
		await placeMarketBuyOrder(env, "BTC-USD", btcAmount.toString());

		console.log(`Executing ETH-USD market buy for $${ethAmount.toFixed(2)}...`);
		await placeMarketBuyOrder(env, "ETH-USD", ethAmount.toString());

		console.log("DCA execution completed successfully.");
	} catch (error: any) {
		console.error(`DCA execution failed with exception: ${error.message}`);
		await sendErrorEmail(env, "Execution Exception", error.message);
		throw error;
	}
}
