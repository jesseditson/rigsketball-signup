import apiRouter from "./router";

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		console.log(`[${request.method}] ${request.url}`);
		return apiRouter.fetch(request, env);
	},
};
