import { json } from '../utils/json.js';

export async function callGraphQL(client, query, variables = {}) {
  try {
    const response = await client.graphql(query, { variables });
    const result = await response.json();

    if (result.errors) {
      console.error('GraphQL Errors:', result.errors);
      throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  } catch (error) {
    console.error('GraphQL Call Error:', error);
    throw error;
  }
}

export const GET_SHOP_INFO = `#graphql
  query GetShopInfo {
    shop {
      id
      name
      url
      email
      plan {
        displayName
      }
      billingAddress {
        address1
        city
        province
        country
        zip
      }
    }
  }
`;

export const GET_ORDERS_ANALYTICS = `#graphql
  query GetOrdersAnalytics($query: String) {
    orders(first: 250, query: $query) {
      edges {
        node {
          id
          name
          createdAt
          customer {
            email
          }
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
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function getShopInfo(adminClient) {
  return callGraphQL(adminClient, GET_SHOP_INFO);
}

export async function getOrdersWithSchedules(adminClient, limit = 50) {
  return callGraphQL(adminClient, GET_ORDERS_ANALYTICS, {
    variables: {
      query: 'metafield:schedule.delivery_date:* OR metafield:schedule.pickup_date:*',
    },
  });
}

export function extractScheduleDataFromOrder(order) {
  const scheduleData = {
    deliveryDate: null,
    pickupDate: null,
    scheduleType: null,
  };

  if (!order.metafields) {
    return scheduleData;
  }

  const metafields = order.metafields.edges || [];

  metafields.forEach(({ node }) => {
    if (node.namespace === 'schedule') {
      if (node.key === 'delivery_date') {
        scheduleData.deliveryDate = node.value;
      } else if (node.key === 'pickup_date') {
        scheduleData.pickupDate = node.value;
      } else if (node.key === 'schedule_type') {
        scheduleData.scheduleType = node.value;
      }
    }
  });

  return scheduleData;
}

export function formatScheduleDataForDisplay(scheduleData) {
  if (!scheduleData.deliveryDate && !scheduleData.pickupDate) {
    return null;
  }

  const date = scheduleData.deliveryDate || scheduleData.pickupDate;
  const type = scheduleData.scheduleType || 
    (scheduleData.deliveryDate ? 'delivery' : 'pickup');

  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    date: formattedDate,
    type: type.charAt(0).toUpperCase() + type.slice(1),
    rawDate: date,
  };
}
