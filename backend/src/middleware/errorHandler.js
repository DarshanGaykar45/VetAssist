/**
 * Centralized error handler middleware
 */
export function errorHandler(err, req, res, next) {
  // Log error internally
  console.error('[API Error]:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    const fields = err.meta?.target || 'record';
    return res.status(409).json({
      success: false,
      message: `A record with this ${Array.isArray(fields) ? fields.join(', ') : fields} already exists.`,
    });
  }

  // Handle Prisma record not found (P2025)
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Requested record was not found or has been removed.',
    });
  }

  // Default internal server error - never leak stack traces, database error messages, or file paths
  const statusCode = err.statusCode || 500;
  
  // Safe user-facing message
  let clientMessage = 'An unexpected server error occurred. Please try again later.';
  if (err.isOperational && err.message) {
    // Strip any possible filesystem paths from operational messages
    clientMessage = err.message.replace(/[A-Za-z]:\\[^ \n\r\t]+/g, '[path]').replace(/\/[a-zA-Z0-9_\-\./]+/g, '[path]');
  }

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
  });
}
