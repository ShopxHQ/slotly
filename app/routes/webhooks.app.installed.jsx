import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { admin } = await authenticate.webhook(request);

  try {
    if (admin) {
      console.log("App installed, creating free shipping discount...");
      const mutation = `#graphql
        mutation discountCodeFreeShippingCreate($freeShippingCodeDiscount: DiscountCodeFreeShippingInput!) {
          discountCodeFreeShippingCreate(freeShippingCodeDiscount: $freeShippingCodeDiscount) {
            codeDiscountNode {
              id
            }
            userErrors {
              field
              code
              message
            }
          }
        }
      `;
      
      const response = await admin.graphql(mutation, {
        variables: {
          freeShippingCodeDiscount: {
            startsAt: new Date().toISOString(),
            appliesOncePerCustomer: false,
            title: "Free Pickup",
            code: "FREEPICKUP",
            customerSelection: {
              all: true
            },
            destination: {
              all: true
            },
            minimumRequirement: {
              subtotal: {
                greaterThanOrEqualToSubtotal: 0.01
              }
            }
          }
        }
      });

      const errors = response.data?.discountCodeFreeShippingCreate?.userErrors || [];
      if (errors.length > 0) {
        console.log("Discount creation response:", errors);
      } else {
        console.log("Free shipping discount created on app install");
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
};
