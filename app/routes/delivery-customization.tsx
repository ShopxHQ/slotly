import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const mutation = `
    mutation CreateDeliveryCustomization {
      deliveryCustomizationCreate(
        input: {
          title: "Free Shipping for Store Pickup"
          description: "Makes shipping free when customer selects store pickup"
          deliveryCustomizationFunction: "https://example.com/.netlify/functions/delivery-customization"
          enabled: true
        }
      ) {
        deliveryCustomization {
          id
          title
          enabled
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(mutation);
    const data = await response.json();
    
    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
    }

    return {
      success: !data.errors,
      customization: data.data?.deliveryCustomizationCreate?.deliveryCustomization,
      errors: data.errors
    };
  } catch (error) {
    console.error("Error creating delivery customization:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default function DeliveryCustomizationCreate() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Store Pickup Free Shipping</h1>
      <p>
        The delivery customization for free shipping on store pickup has been configured.
        Free shipping will be available only when customers select a store pickup option.
      </p>
    </div>
  );
}
