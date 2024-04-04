import { Attributes, Context, Span, SpanKind } from '@opentelemetry/api';

export const TRACE_SERVICE_TOKEN = 'TRACER_SERVICE_TOKEN';

export interface ITraceService {
  createParentSpan(spanName: string): Span;
  createChildSpan<F extends (span?: Span) => ReturnType<F>>(
    attributes: Attributes,
    parentContext: Context | null,
    spanName: string,
    spanKind: SpanKind,
    cb: F,
  ): ReturnType<F>;
  getActiveContext(): Context;
  getContextFromSpan(span?: Span): Context;
  getSpanFromContext(ctx: Context): Span;
  extractFromPropagation(payload: Record<string, any>): Context;
  injectToPropagation(payload: Record<string, any>, span?: Span): void;
}
