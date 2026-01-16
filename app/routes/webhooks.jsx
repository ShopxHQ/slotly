import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Compliance webhooks don't require any action in many cases, 
  // but they must be acknowledged with a 200 OK.
  // authenticate.webhook(request) will throw a 401 if HMAC is invalid.

  return new Response();
};
