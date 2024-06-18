const allowedOrigins = new Set(["https://rigsketball.onarchival.dev"]);

export const handleCors = (
  request: Request,
  env: unknown & { DEV?: boolean }
): [false, Response] | [true, Record<string, string>] => {
  const requestOrigin = request.headers.get("Origin");
  console.log(env.DEV, requestOrigin);
  if (!env.DEV) {
    if (requestOrigin && !allowedOrigins.has(requestOrigin)) {
      return [
        false,
        new Response(null, {
          status: 401,
        }),
      ];
    }
  }
  if (request.method === "OPTIONS") {
    return [
      false,
      new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods":
            "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Origin": requestOrigin!,
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, Baggage, sentry-trace, tracestate, traceparent",
          Vary: "Origin",
        },
      }),
    ];
  }
  return [
    true,
    {
      "Access-Control-Allow-Origin": requestOrigin!,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Expose-Headers":
        "Etag, Content-Range, Content-Length, Transfer-Encoding, tracestate, traceparent",
      Vary: "Origin",
    },
  ];
};
