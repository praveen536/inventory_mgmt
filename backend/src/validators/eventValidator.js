function validateEvent(event) {
  const errors = [];

  if (!event.event_id || typeof event.event_id !== 'string') {
    errors.push('event_id is required and must be a string');
  }

  if (!event.product_id || typeof event.product_id !== 'string') {
    errors.push('product_id is required and must be a string');
  }

  if (!event.event_type || !['purchase', 'sale'].includes(event.event_type)) {
    errors.push('event_type must be "purchase" or "sale"');
  }

  if (!Number.isInteger(event.quantity) || event.quantity <= 0) {
    errors.push('quantity must be a positive integer');
  }

  if (event.event_type === 'purchase') {
    if (typeof event.unit_price !== 'number' || event.unit_price < 0) {
      errors.push('unit_price is required for purchases and must be >= 0');
    }
  }

  if (!event.timestamp || isNaN(Date.parse(event.timestamp))) {
    errors.push('timestamp is required and must be a valid ISO date');
  }

  return errors;
}

module.exports = { validateEvent };
