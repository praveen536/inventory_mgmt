const { validateEvent } = require('../validators/eventValidator');
const { sendEvents } = require('../kafka/producer');

const simulatorController = {
  async sendEvents(req, res, next) {
    try {
      const { events } = req.body;

      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'events must be a non-empty array' },
        });
      }

      // Validate all events before sending any
      const validationErrors = [];
      events.forEach((event, index) => {
        const errors = validateEvent(event);
        if (errors.length > 0) {
          validationErrors.push({ index, event_id: event.event_id, errors });
        }
      });

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Some events failed validation',
            details: validationErrors,
          },
        });
      }

      await sendEvents(events);

      res.json({
        success: true,
        data: { message: `${events.length} events sent to Kafka`, count: events.length },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = simulatorController;
