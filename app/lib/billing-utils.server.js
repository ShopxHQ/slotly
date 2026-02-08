export const GET_ACTIVE_SUBSCRIPTIONS = `#graphql
  query GetActiveSubscriptions {
    appInstallation {
      activeSubscriptions {
        id
        name
        status
      }
    }
  }
`;

export async function hasActiveSubscription(adminGraphql) {
  try {
    const response = await adminGraphql(GET_ACTIVE_SUBSCRIPTIONS);
    const result = await response.json();
    
    if (result.data && result.data.appInstallation && result.data.appInstallation.activeSubscriptions) {
      const activeSubscriptions = result.data.appInstallation.activeSubscriptions;
      // Filter for ACTIVE status
      const hasActive = activeSubscriptions.some(sub => sub.status === 'ACTIVE');
      return hasActive;
    }
    return false;
  } catch (error) {
    console.error('Error checking subscriptions:', error);
    return false;
  }
}
