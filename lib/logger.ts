type LogLevel = 'error' | 'warn' | 'info';

interface LogPayload {
  message: string;
  context?: string;
  data?: unknown;
}

export function logError(payload: LogPayload): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${payload.context ?? 'app'}]`, payload.message, payload.data ?? '');
    return;
  }
  console.error(
    JSON.stringify({
      level: 'error',
      context: payload.context ?? 'app',
      message: payload.message,
      data: payload.data ?? null,
      timestamp: new Date().toISOString(),
    })
  );
}

export function logWarn(payload: LogPayload): void {
  if (process.env.NODE_ENV !== 'test') {
    console.warn(`[${payload.context ?? 'app'}]`, payload.message, payload.data ?? '');
  }
}
