import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  const deliveryCustomizationId =
    url.searchParams.get("deliveryCustomizationId") ||
    url.searchParams.get("delivery_customization_id") ||
    url.searchParams.get("id");

  console.log("DELIVERY CUSTOMIZATION ID:", deliveryCustomizationId);

  if (!deliveryCustomizationId) {
    return new Response(
      JSON.stringify({ error: "Missing deliveryCustomizationId" }),
      { status: 400 }
    );
  }

  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `
    mutation EnableDeliveryCustomization($id: ID!) {
      deliveryCustomizationUpdate(
        id: $id
        deliveryCustomization: { enabled: true }
      ) {
        deliveryCustomization {
          id
          enabled
        }
        userErrors {
          message
        }
      }
    }
    `,
    { variables: { id: deliveryCustomizationId } }
  );

  const result = await response.json();

  console.log("ENABLE RESULT:", JSON.stringify(result));

  return new Response(
    JSON.stringify({ success: true, result }),
    { status: 200 }
  );
};
