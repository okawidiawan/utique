import pino from "pino";

/**
 * Instance logger utama untuk aplikasi Utique.
 * - Di development: output pretty-printed untuk kemudahan baca.
 * - Di production: output JSON raw untuk log aggregator.
 */
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // Pretty print hanya di development
  transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty", options: { colorize: true } } : undefined,
});

export { logger };
