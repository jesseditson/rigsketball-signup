import { Base64 } from "js-base64";

// See:
// https://hookdeck.com/blog/how-to-call-google-cloud-apis-from-cloudflare-workers
export const getToken = async (serviceAccountJSON: string) => {
	const serviceAccount = JSON.parse(serviceAccountJSON);
	const pem = serviceAccount.private_key.replace(/\n/g, "");
	const pemHeader = "-----BEGIN PRIVATE KEY-----";
	const pemFooter = "-----END PRIVATE KEY-----";

	if (!pem.startsWith(pemHeader) || !pem.endsWith(pemFooter)) {
		throw new Error("Invalid service account private key");
	}

	const pemContents = pem.substring(
		pemHeader.length,
		pem.length - pemFooter.length
	);

	const buffer = Base64.toUint8Array(pemContents);
	const algorithm = {
		name: "RSASSA-PKCS1-v1_5",
		hash: {
			name: "SHA-256",
		},
	};

	const extractable = false;
	const keyUsages = ["sign"];

	const privateKey = await crypto.subtle.importKey(
		"pkcs8",
		buffer,
		algorithm,
		extractable,
		keyUsages
	);

	const header = Base64.encodeURI(
		JSON.stringify({
			alg: "RS256",
			typ: "JWT",
			kid: serviceAccount.private_key_id,
		})
	);

	const iat = Math.floor(Date.now() / 1000);
	const exp = iat + 3600;

	const payload = Base64.encodeURI(
		JSON.stringify({
			iss: serviceAccount.client_email,
			sub: serviceAccount.client_email,
			aud: "https://oauth2.googleapis.com/token",
			exp,
			iat,
			// scope: "https://www.googleapis.com/auth/drive.file"
			scope: "https://www.googleapis.com/auth/spreadsheets",
		})
	);

	const textEncoder = new TextEncoder();
	const inputArrayBuffer = textEncoder.encode(`${header}.${payload}`);

	const outputArrayBuffer = await crypto.subtle.sign(
		{ name: "RSASSA-PKCS1-v1_5" },
		privateKey,
		inputArrayBuffer
	);

	const signature = Base64.fromUint8Array(
		new Uint8Array(outputArrayBuffer),
		true
	);

	const jwtToken = `${header}.${payload}.${signature}`;

	const res = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion: jwtToken,
		}),
	});
	if (!res.ok) {
		throw new Error(`Auth Error: ${await res.text()}`);
	}
	const tokenInfo = (await res.json()) as {
		access_token: string;
		scope: string;
		token_type: string;
		expires_in: number;
	};
	return tokenInfo.access_token;
};

export const googleAPI =
	(token: string, baseURL: string) =>
	async (method: "GET" | "POST", endpoint: string, body?: Object) => {
		const res = await fetch(`${baseURL}/${endpoint}`, {
			method,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: body ? JSON.stringify(body) : null,
		});
		console.log(`[${method}] ${baseURL}/${endpoint} ${res.status}`);
		if (!res.ok) {
			throw new Error(`Google API Error: ${await res.text()}`);
		}
		return res.json();
	};
