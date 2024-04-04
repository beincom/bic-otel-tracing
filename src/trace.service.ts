import { Injectable, Logger } from '@nestjs/common';
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

import { containerDetector } from '@opentelemetry/resource-detector-container';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import {
  Detector,
  Resource,
  envDetector,
  hostDetector,
  osDetector,
  processDetector,
} from '@opentelemetry/resources';

import { KafkaJsInstrumentation } from 'opentelemetry-instrumentation-kafkajs';
import { Message } from 'kafkajs';

import {
  ConsoleSpanExporter,
  ParentBasedSampler,
  Sampler,
  SpanExporter,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-node';

import {
  Attributes,
  Context,
  ROOT_CONTEXT,
  Span,
  SpanKind,
  context,
  propagation,
  trace,
} from '@opentelemetry/api';

import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
} from '@opentelemetry/semantic-conventions';

import { ITraceService } from './interfaces';
import { TraceConfig } from './type';

@Injectable()
export class TraceService implements ITraceService {
  private readonly _logger = new Logger(TraceService.name);
  public constructor(public readonly configs: TraceConfig) {
    this._start(configs);
  }

  private _start(configs: TraceConfig) {
    const instrumentations = this._getInstrumentations(configs.serviceName);
    const resource = this._getResources(configs.env, configs.serviceName);
    const resourceDetectors = this._getResourceDetectors();
    const sampler = this._getSampler(configs.samplerRatio);
    const traceExporter = this._getTraceExporter(
      configs.collectorUrl,
      configs.concurrencyLimit,
      configs.isDebug,
      configs.timeout,
      configs.token,
    );

    const sdk = new NodeSDK({
      traceExporter: traceExporter,
      instrumentations: instrumentations,
      sampler: sampler,
      resource: resource,
      resourceDetectors: resourceDetectors,
    });

    sdk.start();
  }

  private _getInstrumentations(serviceName: string) {
    return [
      new KafkaJsInstrumentation({
        consumerHook: (span: Span, topic: string, message: Message): void => {
          span.setAttribute['message'] = JSON.stringify(message);
        },
      }),
      getNodeAutoInstrumentations({
        ['@opentelemetry/instrumentation-http']: {
          enabled: true,
        },
        ['@opentelemetry/instrumentation-fs']: {
          requireParentSpan: true,
        },
        ['@opentelemetry/instrumentation-pino']: {
          logHook: (span, record) => {
            record['resource.service.name'] = serviceName;
          },
        },
      }),
    ];
  }

  private _getResources(env: string, serviceName: string): Resource {
    return Resource.default().merge(
      new Resource({
        [SEMRESATTRS_SERVICE_NAME]: serviceName,
        [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: env,
      }),
    );
  }

  private _getResourceDetectors(): Detector[] {
    return [
      containerDetector,
      envDetector,
      hostDetector,
      osDetector,
      processDetector,
    ];
  }

  private _getSampler(samplerTraceRatio: number): Sampler {
    return new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(samplerTraceRatio),
    });
  }

  private _getTraceExporter(
    collectorUrl: string,
    concurrency: number,
    isDebug: boolean,
    timeout: number,
    token: string,
  ): SpanExporter {
    if (isDebug) {
      return new ConsoleSpanExporter();
    } else {
      return new OTLPTraceExporter({
        url: collectorUrl,
        headers: {
          Authorization: token,
        },
        compression: CompressionAlgorithm.GZIP,
        concurrencyLimit: concurrency,
        timeoutMillis: timeout,
      });
    }
  }

  public createParentSpan(spanName: string): Span {
    const tracer = trace.getTracer(this.configs.serviceName);
    const span = tracer.startSpan(spanName, { root: true });
    return span;
  }

  public createChildSpan<F extends (span?: Span) => ReturnType<F>>(
    attributes: Attributes,
    parentContext: Context | null,
    spanName: string,
    spanKind: SpanKind,
    cb: F,
  ): ReturnType<F> {
    if (this.configs.isEnabled) {
      const tracer = trace.getTracer(this.configs.serviceName);
      if (!parentContext) {
        parentContext = this.getActiveContext();
      }

      const span = tracer.startSpan(
        spanName,
        {
          kind: spanKind,
          attributes: attributes,
        },
        parentContext,
      );

      return cb(span);
    } else {
      return cb(undefined);
    }
  }

  public getActiveContext(): Context {
    return context.active();
  }

  public getContextFromSpan(span?: Span): Context {
    if (span) {
      return trace.setSpan(context.active(), span);
    }
    return null;
  }

  public getSpanFromContext(ctx: Context): Span {
    return trace.getSpan(ctx);
  }

  public extractFromPropagation(payload: Record<string, any>): Context {
    return propagation.extract(ROOT_CONTEXT, payload);
  }

  public injectToPropagation(payload: Record<string, any>, span?: Span): void {
    if (span) {
      propagation.inject(trace.setSpan(context.active(), span), payload);
    }
  }
}
