export function logInfo(context: string, message: string, payload?: unknown) {
  if (payload === undefined) {
    console.info(`[${new Date().toISOString()}] [${context}] ${message}`);
    return;
  }
  console.info(`[${new Date().toISOString()}] [${context}] ${message}`, payload);
}

export function logWarn(context: string, message: string, payload?: unknown) {
  if (payload === undefined) {
    console.warn(`[${new Date().toISOString()}] [${context}] ${message}`);
    return;
  }
  console.warn(`[${new Date().toISOString()}] [${context}] ${message}`, payload);
}

export function logError(context: string, message: string, error: unknown, payload?: unknown) {
  if (payload === undefined) {
    console.error(`[${new Date().toISOString()}] [${context}] ${message}`, error);
    return;
  }
  console.error(`[${new Date().toISOString()}] [${context}] ${message}`, error, payload);
}
