/**
 * SIMPLE LOGGER UTILITY
 * 
 * Purpose: Production-safe logging that only outputs in development
 * 
 * Interview Q: Why not use console.log directly?
 * -> Debug logs can leak sensitive info (tokens, user IDs, file paths)
 * -> Attackers can use this info to understand your system
 * -> Production logs should be structured and minimal
 * 
 * Interview Q: What about Winston/Pino?
 * -> For a production app, yes! They offer:
 *    - Log levels (debug, info, warn, error)
 *    - Log rotation (prevent disk full)
 *    - JSON format for log aggregation (Datadog, CloudWatch)
 *    - Redaction of sensitive fields
 * -> This simple logger is sufficient for demo/interview purposes
 * 
 * Usage:
 *   import { logger } from './utils/logger';
 *   logger.debug('Processing item', itemId);  // Only in dev
 *   logger.info('Server started');            // Only in dev
 *   logger.warn('Rate limit approaching');    // Always
 *   logger.error('Database failed', error);   // Always
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Logger object with different log levels
 * 
 * - debug: Development only, verbose debugging info
 * - info: Development only, general information
 * - warn: Always logged, potential issues
 * - error: Always logged, actual errors
 */
export const logger = {
  /**
   * Debug level - Development only
   * Use for: Detailed debugging, variable values, flow tracking
   * Never logs in production to avoid leaking sensitive info
   */
  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  },

  /**
   * Info level - Development only
   * Use for: General information, startup messages, successful operations
   * Suppressed in production to reduce noise
   */
  info: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log('[INFO]', new Date().toISOString(), ...args);
    }
  },

  /**
   * Warn level - Always logged
   * Use for: Potential issues, deprecated usage, approaching limits
   * Logged in production because these need attention
   */
  warn: (...args: unknown[]): void => {
    console.warn('[WARN]', new Date().toISOString(), ...args);
  },

  /**
   * Error level - Always logged
   * Use for: Actual errors, exceptions, failed operations
   * Always logged because errors need investigation
   * 
   * Note: In production, consider:
   * - NOT logging full stack traces
   * - NOT logging request bodies (may contain passwords)
   * - Using structured logging for log aggregation
   */
  error: (...args: unknown[]): void => {
    // In production, we log but sanitize
    if (isDevelopment) {
      console.error('[ERROR]', new Date().toISOString(), ...args);
    } else {
      // Production: Log without potentially sensitive stack details
      const sanitized = args.map(arg => {
        if (arg instanceof Error) {
          return { message: arg.message, name: arg.name };
        }
        return arg;
      });
      console.error('[ERROR]', new Date().toISOString(), ...sanitized);
    }
  }
};

/**
 * Example usage patterns:
 * 
 * // Instead of:
 * console.log(`📝 Claim request for item: ${itemId} by user ${userId}`);
 * 
 * // Use:
 * logger.debug('Claim request', { itemId, userId });
 * 
 * // Instead of:
 * console.error('Login error:', error);
 * 
 * // Use:
 * logger.error('Login failed', error);
 * 
 * // For startup messages:
 * logger.info('Server running on port', PORT);
 */

export default logger;
