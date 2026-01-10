import { Outlet, useLoaderData, useRouteError, useLocation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { setStoreRules } from "../lib/metafield-utils.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export const action = async ({ request }) => {
  console.log('=== ACTION HANDLER CALLED ===');
  console.log('Method:', request.method);
  
  if (request.method !== 'POST') {
    return response({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    console.log('Step 1: Authenticating original request...');
    const { admin } = await authenticate.admin(request);
    console.log('Step 2: Authenticated successfully');
    
    console.log('Step 3: Cloning request to read body...');
    const clonedRequest = request.clone();
    const bodyText = await clonedRequest.text();
    console.log('Step 4: Body length:', bodyText.length);
    
    if (!bodyText) {
      return response({ success: false, error: 'Empty request body' }, 400);
    }
    
    console.log('Step 5: Body preview:', bodyText.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (parseErr) {
      console.error('Step 6: JSON parse failed:', parseErr.message);
      return response({ success: false, error: `JSON parse error: ${parseErr.message}` }, 400);
    }
    
    console.log('Step 7: Parsed data keys:', Object.keys(data));
    
    let rules = data.rules;
    console.log('Step 8: Rules type:', typeof rules);
    
    if (typeof rules === 'string') {
      try {
        rules = JSON.parse(rules);
        console.log('Step 9a: Parsed rules from string');
      } catch (e) {
        return response({ success: false, error: `Rules parse error: ${e.message}` }, 400);
      }
    } else {
      console.log('Step 9b: Rules already an object');
    }
    
    if (!rules || (Array.isArray(rules) && rules.length === 0)) {
      return response({ success: false, error: 'No rules provided' }, 400);
    }

    console.log('Step 10: Calling setStoreRules...');
    const success = await setStoreRules(admin.graphql, rules);
    console.log('Step 11: setStoreRules returned:', success);

    if (success) {
      console.log('SUCCESS: Rules saved to metafield');
      return response({ success: true, error: null }, 200);
    } else {
      console.log('FAILED: setStoreRules returned false');
      return response({ success: false, error: 'Failed to save to metafield' }, 400);
    }
  } catch (error) {
    console.error('=== UNHANDLED ERROR ===');
    console.error('Type:', error?.constructor?.name);
    console.error('Message:', error?.message);
    console.error('Stack:', error?.stack);
    
    return response(
      { 
        success: false, 
        error: error?.message || 'Unknown server error',
      },
      500
    );
  }
};

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Pickup</s-link>
        <s-link href="/app/delivery">Delivery</s-link>
        <s-link href="/app/schedules">Schedules</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
