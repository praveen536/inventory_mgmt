function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err.message);

  if (err.code === 'INSUFFICIENT_INVENTORY') {
    return res.status(409).json({
      success: false,
      error: { code: 'INSUFFICIENT_INVENTORY', message: err.message },
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message },
    });
  }

  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

module.exports = errorHandler;
