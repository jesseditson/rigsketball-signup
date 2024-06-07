import { handleCors } from "./cors";
import apiRouter from "./api";

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
		return apiRouter
			.fetch(request, env, headers)
			.then((r) => {
				return new Response(JSON.stringify(r), {
					headers: {
						"Content-Type": "application/json",
						...headers,
					},
				});
			})
			.catch((e) => {
				return new Response(e, {
					headers: {
						"Content-Type": "text/plain",
						...headers,
					},
					status: 500,
				});
			});
	},
};
