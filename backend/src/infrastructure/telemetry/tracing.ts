/**
 * @packageDocumentation
 *
 * Thin helpers for manual domain spans on top of the active tracer.
 */
import {
  context,
  SpanStatusCode,
  trace,
  type Attributes,
  type Span,
} from '@opentelemetry/api';

const tracer = trace.getTracer('menu-api');

/**
 * Runs `fn` inside a named span. On throw, records the exception and marks the
 * span as error before rethrowing.
 *
 * @typeParam T - Return type of `fn`.
 * @param name - Span name (e.g. `menu.create`).
 * @param fn - Work to execute within the span.
 * @param attributes - Optional span attributes.
 * @returns The result of `fn`.
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Attributes,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    if (attributes) {
      span.setAttributes(attributes);
    }
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(
        error instanceof Error ? error : new Error(String(error)),
      );
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Records an exception on the active span (if any) and marks it as error.
 *
 * @param error - Arbitrary error value.
 */
export function recordActiveSpanError(error: unknown): void {
  const span = trace.getSpan(context.active());
  if (!span) {
    return;
  }
  span.recordException(
    error instanceof Error ? error : new Error(String(error)),
  );
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error instanceof Error ? error.message : String(error),
  });
}

/**
 * Active trace/span ids for log correlation, or `undefined` when no span.
 *
 * @returns Correlation fields suitable for Pino mixins.
 */
export function activeTraceFields():
  | { trace_id: string; span_id: string }
  | undefined {
  const span = trace.getSpan(context.active());
  if (!span) {
    return undefined;
  }
  const spanContext = span.spanContext();
  if (!spanContext.traceId || !spanContext.spanId) {
    return undefined;
  }
  return {
    trace_id: spanContext.traceId,
    span_id: spanContext.spanId,
  };
}
