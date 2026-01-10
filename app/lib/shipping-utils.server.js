export async function ensureFreePickupShippingMethod(graphql) {
  try {
    const query = `
      query {
        shop {
          shippingZones(first: 100) {
            edges {
              node {
                id
                name
                shippingMethods(first: 100) {
                  edges {
                    node {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await graphql(query);
    const zones = response.data?.shop?.shippingZones?.edges || [];

    if (!zones.length) {
      console.log('No shipping zones found');
      return false;
    }

    const zone = zones[0].node;
    const methods = zone.shippingMethods?.edges || [];
    const hasPickup = methods.some(
      (m) => m.node.name.toLowerCase().includes('pickup') || 
              m.node.name.toLowerCase().includes('free')
    );

    if (hasPickup) {
      console.log('Free Pickup method already exists:', zone.name);
      return true;
    }

    const createMutation = `
      mutation CreateShippingMethod($zoneId: ID!) {
        shippingMethodCreate(zoneId: $zoneId, input: {name: "Free Pickup", rateDefinition: {price: {amount: "0"}}}) {
          shippingMethod {
            id
            name
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    console.log('Creating Free Pickup method in zone:', zone.id);
    const createResponse = await graphql(createMutation, {
      variables: {
        zoneId: zone.id
      }
    });

    console.log('Creation response:', JSON.stringify(createResponse, null, 2));

    if (createResponse.data?.shippingMethodCreate?.userErrors?.length) {
      console.error('Error creating shipping method:', createResponse.data.shippingMethodCreate.userErrors);
      return false;
    }

    if (createResponse.errors) {
      console.error('GraphQL errors:', createResponse.errors);
      return false;
    }

    console.log('Free Pickup method created successfully in zone:', zone.name);
    return true;
  } catch (error) {
    console.error('Failed to ensure free pickup method:', error);
    return false;
  }
}
