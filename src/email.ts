export interface Env {
	EXCHANGE_API_KEY: string;
	EXCHANGE_PRIVATE_KEY: string;
	EXCHANGE_API_URL: string;
	JWT_ISSUER: string;
	RESEND_API_KEY: string;
	NOTIFICATION_EMAIL: string;
	BTC_DCA_AMOUNT: string;
	ETH_DCA_AMOUNT: string;
}

export async function sendErrorEmail(env: Env, errorTitle: string, errorMessage: string): Promise<void> {
	if (!env.RESEND_API_KEY || !env.NOTIFICATION_EMAIL) {
		console.warn("Resend API key or notification email not configured. Skipping email alert.");
		return;
	}

	const payload = {
		from: "Automated DCA Bot <onboarding@resend.dev>",
		to: [env.NOTIFICATION_EMAIL],
		subject: `🚨 DCA Bot Error: ${errorTitle}`,
		html: `<h2>Execution Error</h2>
               <p><strong>Error Type:</strong> ${errorTitle}</p>
               <p><strong>Message:</strong> ${errorMessage}</p>
               <p><strong>Time:</strong> ${new Date().toISOString()}</p>`
	};

	let apiKey = env.RESEND_API_KEY.trim();
	if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
		apiKey = apiKey.substring(1, apiKey.length - 1);
	}

	try {
		const response = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			console.error(`Failed to send email alert: ${response.status} ${response.statusText}`);
			const text = await response.text();
			console.error(`Resend Response: ${text}`);
		} else {
			console.log(`Successfully sent error email for: ${errorTitle}`);
		}
	} catch (e: any) {
		console.error(`Exception while sending email: ${e.message}`);
	}
}
