export async function ensureFreeShippingDiscount(graphql) {
  try {
    const createMutation = `#graphql
      mutation discountCodeFreeShippingCreate($freeShippingCodeDiscount: DiscountCodeFreeShippingInput!) {
        discountCodeFreeShippingCreate(freeShippingCodeDiscount: $freeShippingCodeDiscount) {
          codeDiscountNode {
            id
            codeDiscount {
              ... on DiscountCodeFreeShipping {
                title
              }
            }
          }
          userErrors {
            field
            code
            message
          }
        }
      }
    `;

    console.log('Creating FREEPICKUP free shipping discount...');
    const createResponse = await graphql(createMutation, {
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
              greaterThanOrEqualToSubtotal: 0
            }
          }
        }
      }
    });

    const userErrors = createResponse.data?.discountCodeFreeShippingCreate?.userErrors || [];
    
    if (userErrors.length > 0) {
      const errorMsg = userErrors[0]?.message || '';
      if (errorMsg.includes('already exists')) {
        console.log('Free Pickup discount already exists');
        return 'FREEPICKUP';
      }
      console.error('Error creating discount:', userErrors);
      return null;
    }

    console.log('Free Pickup free shipping discount created successfully');
    return 'FREEPICKUP';
  } catch (error) {
    console.error('Failed to ensure free shipping discount:', error);
    return null;
  }
}
