export const METAFIELD_DEFINITIONS = {
  ORDER: [
    {
      namespace: 'schedule',
      key: 'delivery_date',
      name: 'Delivery Date',
      description: 'Customer selected delivery date',
      type: 'date',
      ownerType: 'ORDER',
    },
    {
      namespace: 'schedule',
      key: 'delivery_time',
      name: 'Delivery Time',
      description: 'Customer selected delivery time',
      type: 'single_line_text',
      ownerType: 'ORDER',
    },
    {
      namespace: 'schedule',
      key: 'pickup_date',
      name: 'Pickup Date',
      description: 'Customer selected pickup date',
      type: 'date',
      ownerType: 'ORDER',
    },
    {
      namespace: 'schedule',
      key: 'pickup_time',
      name: 'Pickup Time',
      description: 'Customer selected pickup time',
      type: 'single_line_text',
      ownerType: 'ORDER',
    },
    {
      namespace: 'schedule',
      key: 'schedule_type',
      name: 'Schedule Type',
      description: 'Type of scheduling (delivery or pickup)',
      type: 'single_line_text',
      ownerType: 'ORDER',
    },
  ],
  SHOP: [
    {
      namespace: 'store_config',
      key: 'store_rules',
      name: 'Store Rules Configuration',
      description: 'Complete store configuration with hours, closures, and timezone',
      type: 'json',
      ownerType: 'SHOP',
    },
  ],
};

export const CREATE_METAFIELD_DEFINITION = `#graphql
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      metafieldDefinition {
        id
        name
        namespace
        key
        type {
          name
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const GET_METAFIELD_DEFINITIONS = `#graphql
  query GetMetafieldDefinitions($ownerType: MetafieldOwnerType!) {
    metafieldDefinitions(ownerType: $ownerType, first: 250) {
      edges {
        node {
          id
          name
          namespace
          key
          type {
            name
          }
        }
      }
    }
  }
`;

export const SET_ORDER_METAFIELDS = `#graphql
  mutation SetOrderMetafields($input: OrderInput!) {
    orderUpdate(input: $input) {
      order {
        id
        metafields(first: 10) {
          edges {
            node {
              namespace
              key
              value
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const GET_ORDER_WITH_METAFIELDS = `#graphql
  query GetOrder($id: ID!) {
    order(id: $id) {
      id
      name
      createdAt
      metafields(first: 10) {
        edges {
          node {
            id
            namespace
            key
            value
            type
          }
        }
      }
    }
  }
`;

export const QUERY_ORDERS_WITH_SCHEDULE = `#graphql
  query QueryOrdersWithSchedule($query: String!) {
    orders(first: 100, query: $query) {
      edges {
        node {
          id
          name
          email
          createdAt
          metafields(first: 10) {
            edges {
              node {
                namespace
                key
                value
              }
            }
          }
        }
      }
    }
  }
`;

export async function ensureMetafieldDefinitions(adminGraphql) {
  try {
    const ownerTypes = ['ORDER', 'SHOP'];
    
    for (const ownerType of ownerTypes) {
      console.log(`Ensuring metafield definitions for ${ownerType}...`);
      
      const existingResponse = await adminGraphql(GET_METAFIELD_DEFINITIONS, {
        variables: { ownerType },
      });

      const existingDefs = existingResponse.metafieldDefinitions.edges.map(
        (edge) => ({
          namespace: edge.node.namespace,
          key: edge.node.key,
        })
      );

      const definitionsToCreate = METAFIELD_DEFINITIONS[ownerType].filter(
        (def) =>
          !existingDefs.some(
            (existing) =>
              existing.namespace === def.namespace && existing.key === def.key
          )
      );

      if (definitionsToCreate.length === 0) {
        console.log(`All ${ownerType} metafield definitions already exist`);
        continue;
      }

      for (const definition of definitionsToCreate) {
        console.log(`Creating metafield definition: ${definition.key} (${ownerType})`);
        
        const createResponse = await adminGraphql(
          CREATE_METAFIELD_DEFINITION,
          {
            variables: {
              definition: {
                namespace: definition.namespace,
                key: definition.key,
                name: definition.name,
                description: definition.description,
                type: definition.type,
                ownerType: definition.ownerType,
              },
            },
          }
        );

        if (createResponse.metafieldDefinitionCreate.userErrors.length > 0) {
          console.error(
            `Failed to create ${definition.key}:`,
            createResponse.metafieldDefinitionCreate.userErrors
          );
        } else {
          console.log(`Successfully created metafield definition: ${definition.key}`);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error ensuring metafield definitions:', error);
    return false;
  }
}

export async function setOrderMetafield(
  adminGraphql,
  orderId,
  namespace,
  key,
  value,
  type
) {
  try {
    const mutation = `#graphql
      mutation SetOrderMetafield($input: OrderInput!) {
        orderUpdate(input: $input) {
          order {
            id
            metafields(first: 10) {
              edges {
                node {
                  namespace
                  key
                  value
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await adminGraphql(mutation, {
      variables: {
        input: {
          id: orderId,
          metafields: [
            {
              namespace,
              key,
              type,
              value,
            },
          ],
        },
      },
    });

    if (response.orderUpdate.userErrors.length > 0) {
      console.error('Error setting metafield:', response.orderUpdate.userErrors);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in setOrderMetafield:', error);
    return false;
  }
}

export function parseScheduleMetafields(metafields) {
  const result = {
    deliveryDate: null,
    pickupDate: null,
    scheduleType: null,
  };

  if (!metafields || !Array.isArray(metafields)) {
    return result;
  }

  metafields.forEach((metafield) => {
    if (metafield.namespace === 'schedule') {
      if (metafield.key === 'delivery_date') {
        result.deliveryDate = metafield.value;
      } else if (metafield.key === 'pickup_date') {
        result.pickupDate = metafield.value;
      } else if (metafield.key === 'schedule_type') {
        result.scheduleType = metafield.value;
      }
    }
  });

  return result;
}

export const GET_SHOP_STORE_RULES = `#graphql
  query GetShopStoreRules {
    shop {
      metafield(namespace: "store_config", key: "store_rules") {
        id
        value
      }
    }
  }
`;

export const GET_SHOP_ID = `#graphql
  query GetShopId {
    shop {
      id
    }
  }
`;

export const SET_SHOP_STORE_RULES = `#graphql
  mutation SetShopStoreRules($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const GET_SHOP_DELIVERY_CONFIG = `#graphql
  query GetShopDeliveryConfig {
    shop {
      metafield(namespace: "delivery_config", key: "settings") {
        id
        value
      }
    }
  }
`;

export const SET_SHOP_DELIVERY_CONFIG = `#graphql
  mutation SetShopDeliveryConfig($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function getStoreRules(adminGraphql) {
  try {
    console.log('Fetching store rules from metafield...');
    const response = await adminGraphql(GET_SHOP_STORE_RULES);
    
    const result = await response.json();
    console.log('GetStoreRules response:', JSON.stringify(result, null, 2));
    
    if (result && result.data && result.data.shop && result.data.shop.metafield && result.data.shop.metafield.value) {
      const parsed = JSON.parse(result.data.shop.metafield.value);
      console.log('Parsed store rules:', parsed);
      return parsed;
    }
    
    console.log('No store rules found in metafield');
    return [];
  } catch (error) {
    console.error('Error fetching store rules:', error);
    return [];
  }
}

export async function setStoreRules(adminGraphql, rules) {
  try {
    if (!rules) {
      console.error('setStoreRules: No rules provided');
      return false;
    }
    
    let jsonValue;
    try {
      jsonValue = typeof rules === 'string' ? rules : JSON.stringify(rules);
    } catch (e) {
      console.error('setStoreRules: Failed to stringify rules:', e.message);
      return false;
    }
    
    if (!jsonValue || jsonValue.length === 0) {
      console.error('setStoreRules: Empty JSON value');
      return false;
    }
    
    console.log('setStoreRules: Setting store rules with value length:', jsonValue.length);
    console.log('setStoreRules: First 500 chars:', jsonValue.substring(0, 500));

    console.log('setStoreRules: Fetching shop ID...');
    let shopId;
    try {
      const shopRes = await adminGraphql(GET_SHOP_ID);
      const shopData = await shopRes.json();
      console.log('setStoreRules: Shop data:', JSON.stringify(shopData, null, 2));
      
      shopId = shopData?.data?.shop?.id;
      if (!shopId) {
        console.error('setStoreRules: No shop ID found in response');
        return false;
      }
    } catch (shopIdError) {
      console.error('setStoreRules: Failed to get shop ID:', shopIdError.message);
      return false;
    }

    console.log('setStoreRules: Using shop ID:', shopId);
    
    let response;
    try {
      console.log('setStoreRules: Calling adminGraphql with mutation...');
      response = await adminGraphql(SET_SHOP_STORE_RULES, {
        variables: {
          metafields: [
            {
              namespace: 'store_config',
              key: 'store_rules',
              type: 'json',
              value: jsonValue,
              ownerId: shopId,
            },
          ],
        },
      });
      console.log('setStoreRules: GraphQL call completed');
    } catch (graphqlError) {
      console.error('setStoreRules: GraphQL error:', graphqlError.message);
      console.error('setStoreRules: GraphQL error details:', graphqlError);
      return false;
    }

    if (!response) {
      console.error('setStoreRules: Empty response from GraphQL');
      return false;
    }

    const result = await response.json();
    console.log('setStoreRules: Parsed response:', JSON.stringify(result, null, 2));

    if (result?.data?.metafieldsSet?.userErrors && result.data.metafieldsSet.userErrors.length > 0) {
      console.error('setStoreRules: User errors:', result.data.metafieldsSet.userErrors);
      return false;
    }

    if (!result?.data?.metafieldsSet?.metafields) {
      console.error('setStoreRules: No metafields in response');
      return false;
    }

    console.log('setStoreRules: Store rules saved successfully');
    console.log('setStoreRules: Saved metafields count:', result.data.metafieldsSet.metafields.length);
    return true;
  } catch (error) {
    console.error('setStoreRules: Unexpected exception:', error);
    if (error instanceof Error) {
      console.error('setStoreRules: Error message:', error.message);
      console.error('setStoreRules: Error stack:', error.stack);
    }
    return false;
  }
}

export async function getDeliveryConfig(adminGraphql) {
  try {
    console.log('Fetching delivery config from metafield...');
    const response = await adminGraphql(GET_SHOP_DELIVERY_CONFIG);
    
    const result = await response.json();
    console.log('GetDeliveryConfig response:', JSON.stringify(result, null, 2));
    
    if (result && result.data && result.data.shop && result.data.shop.metafield && result.data.shop.metafield.value) {
      const parsed = JSON.parse(result.data.shop.metafield.value);
      console.log('Parsed delivery config:', parsed);
      return parsed;
    }
    
    console.log('No delivery config found in metafield');
    return null;
  } catch (error) {
    console.error('Error fetching delivery config:', error);
    return null;
  }
}

export async function setDeliveryConfig(adminGraphql, config) {
  try {
    if (!config) {
      console.error('setDeliveryConfig: No config provided');
      return false;
    }
    
    let jsonValue;
    try {
      jsonValue = typeof config === 'string' ? config : JSON.stringify(config);
    } catch (e) {
      console.error('setDeliveryConfig: Failed to stringify config:', e.message);
      return false;
    }
    
    if (!jsonValue || jsonValue.length === 0) {
      console.error('setDeliveryConfig: Empty JSON value');
      return false;
    }
    
    console.log('setDeliveryConfig: Setting delivery config with value length:', jsonValue.length);

    console.log('setDeliveryConfig: Fetching shop ID...');
    let shopId;
    try {
      const shopRes = await adminGraphql(GET_SHOP_ID);
      const shopData = await shopRes.json();
      
      shopId = shopData?.data?.shop?.id;
      if (!shopId) {
        console.error('setDeliveryConfig: No shop ID found in response');
        return false;
      }
    } catch (shopIdError) {
      console.error('setDeliveryConfig: Failed to get shop ID:', shopIdError.message);
      return false;
    }

    console.log('setDeliveryConfig: Using shop ID:', shopId);
    
    let response;
    try {
      console.log('setDeliveryConfig: Calling adminGraphql with mutation...');
      response = await adminGraphql(SET_SHOP_DELIVERY_CONFIG, {
        variables: {
          metafields: [
            {
              namespace: 'delivery_config',
              key: 'settings',
              type: 'json',
              value: jsonValue,
              ownerId: shopId,
            },
          ],
        },
      });
      console.log('setDeliveryConfig: GraphQL call completed');
    } catch (graphqlError) {
      console.error('setDeliveryConfig: GraphQL error:', graphqlError.message);
      return false;
    }

    if (!response) {
      console.error('setDeliveryConfig: Empty response from GraphQL');
      return false;
    }

    const result = await response.json();
    console.log('setDeliveryConfig: Parsed response:', JSON.stringify(result, null, 2));

    if (result?.data?.metafieldsSet?.userErrors && result.data.metafieldsSet.userErrors.length > 0) {
      console.error('setDeliveryConfig: User errors:', result.data.metafieldsSet.userErrors);
      return false;
    }

    if (!result?.data?.metafieldsSet?.metafields) {
      console.error('setDeliveryConfig: No metafields in response');
      return false;
    }

    console.log('setDeliveryConfig: Delivery config saved successfully');
    return true;
  } catch (error) {
    console.error('setDeliveryConfig: Unexpected exception:', error);
    if (error instanceof Error) {
      console.error('setDeliveryConfig: Error message:', error.message);
      console.error('setDeliveryConfig: Error stack:', error.stack);
    }
    return false;
  }
}
