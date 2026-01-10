import prisma from "../db.server";

export async function loader({ request }) {
  try {
    const referer = request.headers.get('referer') || '';
    
    if (!referer) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const refererUrl = new URL(referer);
    const hostname = refererUrl.hostname;
    
    const session = await prisma.session.findFirst({
      where: { 
        shop: { contains: hostname },
        isOnline: true
      },
      orderBy: { createdAt: 'desc' },
    });
    
    if (!session || !session.accessToken) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const response = await fetch(
      `https://${session.shop}/admin/api/2025-10/metafields.json?namespace=store_config&key=store_rules&owner_resource=shop`,
      {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': session.accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const data = await response.json();

    if (data.metafields && data.metafields.length > 0) {
      const metafield = data.metafields[0];
      const rules = JSON.parse(metafield.value || '[]');
      
      return new Response(JSON.stringify(rules), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error fetching store rules:', error);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
