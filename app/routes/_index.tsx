
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Delivery customization created</h1>
      <p>You can close this page and return to Shopify.</p>
    </div>
  );
}
