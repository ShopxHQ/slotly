import { json } from '../../utils/json.js';
import { authenticate } from '../../shopify.server';

export const action = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { payload } = await authenticate.webhook(request);

  try {
    const order = payload;
    const shopDomain = request.headers.get('x-shopify-shop-api-access-token');
    
    if (!order.id) {
      return json({ success: false, error: 'No order ID' }, { status: 400 });
    }

    let deliveryDate = null;
    let pickupDate = null;
    let scheduleType = null;

    if (order.note) {
      const deliveryMatch = order.note.match(/Delivery Date:\s*([^\n]+)/i);
      const pickupMatch = order.note.match(/Pickup Date:\s*([^\n]+)/i);

      if (deliveryMatch) {
        deliveryDate = deliveryMatch[1].trim();
        scheduleType = 'delivery';
      } else if (pickupMatch) {
        pickupDate = pickupMatch[1].trim();
        scheduleType = 'pickup';
      }
    }

    if (order.note_attributes && Array.isArray(order.note_attributes)) {
      const deliveryAttr = order.note_attributes.find(
        (attr) => attr.name === '_delivery_date'
      );
      const pickupAttr = order.note_attributes.find(
        (attr) => attr.name === '_pickup_date'
      );
      const typeAttr = order.note_attributes.find(
        (attr) => attr.name === '_schedule_type'
      );

      if (deliveryAttr) {
        deliveryDate = deliveryAttr.value;
      }
      if (pickupAttr) {
        pickupDate = pickupAttr.value;
      }
      if (typeAttr) {
        scheduleType = typeAttr.value;
      }
    }

    if (!deliveryDate && !pickupDate) {
      return json({ success: true, message: 'No schedule data found' });
    }

    const shop = order.shop?.url || 'unknown';

    const metafieldInput = {
      namespace: 'schedule',
      key: deliveryDate ? 'delivery_date' : 'pickup_date',
      type: 'date',
      value: deliveryDate || pickupDate,
    };

    const typeMetafield = {
      namespace: 'schedule',
      key: 'schedule_type',
      type: 'single_line_text',
      value: scheduleType || (deliveryDate ? 'delivery' : 'pickup'),
    };

    console.log(`[Webhook] Processing order ${order.id} with metafields:`, {
      metafieldInput,
      typeMetafield,
    });

    return json({ 
      success: true, 
      message: 'Order processed',
      data: {
        orderId: order.id,
        scheduleData: {
          deliveryDate,
          pickupDate,
          scheduleType,
        }
      }
    });
  } catch (error) {
    console.error('[Webhook Error]', error);
    return json({ error: error.message }, { status: 500 });
  }
};
