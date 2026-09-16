export const DEMO_WORKSPACE = "the-studio";
export const DEMO_BOARD = "main";
export const DEMO_MEMBER = "you";

export function requireSameOrigin(request: Request) {
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    throw new Response("The request origin could not be verified.", {
      status: 403,
    });
  }
}
