import { Env } from './email';

// Helper for Base64Url encoding
function base64UrlEncode(input: string | Uint8Array): string {
    let base64 = "";
    if (typeof input === "string") {
        base64 = btoa(input);
    } else {
        let binary = "";
        for (let i = 0; i < input.length; i++) {
            binary += String.fromCharCode(input[i]);
        }
        base64 = btoa(binary);
    }
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper to convert PEM to ArrayBuffer (ignoring header/footer and newlines)
function pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64 = pem.replace(/(-----(BEGIN|END) [a-zA-Z0-9 ]+-----)/g, "").replace(/\s+/g, "");
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// Generate the JWT required for Exchange Advanced API
export async function generateExchangeJWT(
    env: Env,
    keyName: string,
    privateKeyPem: string,
    requestMethod: string,
    requestPath: string
): Promise<string> {
    // Replace literal '\n' if injected from env variables
    const cleanPem = privateKeyPem.replace(/\\n/g, '\n');
    
    const cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        pemToArrayBuffer(cleanPem),
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
    );

    const header = {
        alg: "ES256",
        typ: "JWT",
        kid: keyName,
        nonce: crypto.randomUUID()
    };

    const now = Math.floor(Date.now() / 1000);
    const host = new URL(env.EXCHANGE_API_URL).hostname;
    const payload = {
        iss: env.JWT_ISSUER,
        nbf: now,
        exp: now + 120, // 2 minute expiration
        sub: keyName,
        uri: `${requestMethod.toUpperCase()} ${host}${requestPath.split('?')[0]}` // Only path without query params
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const encoder = new TextEncoder();
    const signatureBuffer = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        cryptoKey,
        encoder.encode(dataToSign)
    );

    const encodedSignature = base64UrlEncode(new Uint8Array(signatureBuffer));
    return `${dataToSign}.${encodedSignature}`;
}

export async function fetchExchange(
    env: Env,
    method: string,
    path: string,
    body?: any
): Promise<any> {
    if (!env.EXCHANGE_API_KEY || !env.EXCHANGE_PRIVATE_KEY) {
        throw new Error("Missing Exchange API Credentials");
    }

    const jwt = await generateExchangeJWT(env, env.EXCHANGE_API_KEY, env.EXCHANGE_PRIVATE_KEY, method, path);
    const url = `${env.EXCHANGE_API_URL}${path}`;
    
    const headers: Record<string, string> = {
        "Authorization": `Bearer ${jwt}`,
        "Accept": "application/json"
    };

    if (body) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Exchange API Error [${response.status}]: ${errorText}`);
    }

    return await response.json();
}

// Function to fetch the available balance for a given asset (e.g., "USD")
export async function getAvailableBalance(env: Env, currency: string): Promise<number> {
    let allAccounts: any[] = [];
    let hasNext = true;
    let cursor = "";

    while (hasNext) {
        const path = `/api/v3/brokerage/accounts?limit=250${cursor ? `&cursor=${cursor}` : ""}`;
        const data = await fetchExchange(env, "GET", path);
        
        if (data.accounts) {
            allAccounts = allAccounts.concat(data.accounts);
        }
        
        hasNext = data.has_next;
        cursor = data.cursor;
    }

    const account = allAccounts.find((a: any) => a.currency === currency);
    if (!account) {
        const available = allAccounts.map((a: any) => a.currency).join(', ') || 'none';
        throw new Error(`Could not find account for currency: ${currency}. Available currencies: ${available}`);
    }
    return parseFloat(account.available_balance.value);
}

// Function to place a market order (Buy)
export async function placeMarketBuyOrder(env: Env, productId: string, quoteSize: string): Promise<any> {
    const clientOrderId = crypto.randomUUID();
    const body = {
        client_order_id: clientOrderId,
        product_id: productId,
        side: "BUY",
        order_configuration: {
            market_market_ioc: {
                quote_size: quoteSize
            }
        }
    };
    return await fetchExchange(env, "POST", "/api/v3/brokerage/orders", body);
}
