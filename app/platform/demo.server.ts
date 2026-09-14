export const DEMO_WORKSPACE = "the-studio";
export const DEMO_BOARD = "main";
export const DEMO_MEMBER = "you";

export function requireDemo(request: Request) {
  const host = new URL(request.url).hostname;
  if (
    process.env.DEMO_MODE !== "true" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(host)
  ) {
    throw new Response(
      "This development workspace is available on localhost only.",
      { status: 403 },
    );
  }
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    throw new Response("The request origin could not be verified.", {
      status: 403,
    });
  }
}
