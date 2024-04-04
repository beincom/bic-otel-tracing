import { Span, SpanKind } from '@opentelemetry/api';

export * from '@opentelemetry/api';

export interface TraceConfig {
  collectorUrl: string;
  serviceName: string;
  env?: string;
  isDebug: boolean;
  isEnabled: boolean;
  concurrencyLimit?: number;
  samplerRatio?: number;
  timeout?: number;
  token?: string;
}

export type BaseSpanConfig = {
  spanKind: SpanKind;
  shouldBindContext?: boolean;
  hasAttributes?: boolean;
};

export type SpanConfig = BaseSpanConfig & {
  spanName: string;
};

export type TraceContext = {
  traceId?: string | Buffer | (string | Buffer)[];
  span?: Span;
};
