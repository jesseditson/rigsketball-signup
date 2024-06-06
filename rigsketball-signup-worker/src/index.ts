import { handleCors } from "./cors";
import { json } from "itty-router";
import apiRouter from "./router";

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const [ok, headers] = handleCors(request, env);
		if (!ok) {
			return headers;
		}
		console.log(`[${request.method}] ${request.url}`);
		return apiRouter.fetch(request, env, headers).then((r) => {
			return new Response(JSON.stringify(r), {
				headers: {
					"Content-Type": "application/json",
					...headers,
				},
			});
		});
	},
};
