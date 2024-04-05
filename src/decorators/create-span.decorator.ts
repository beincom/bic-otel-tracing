import { Inject, Logger } from '@nestjs/common';
import { Context, Span, SpanStatusCode } from '@opentelemetry/api';
import { ClsServiceManager } from 'nestjs-cls';

import { createStore, updateStore } from '../utils';

import { SpanConfig, TraceContext } from '../type';
import { ITraceService, TRACE_SERVICE_TOKEN } from '../interfaces';
import { TRACER } from '../constants';

function CreateParentSpan(spanName: string): MethodDecorator {
  const logger = new Logger(CreateSpan.name);
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    const injector = Inject(TRACE_SERVICE_TOKEN);
    injector(target, 'tracerService');

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const traceService = this.tracerService as ITraceService;
      const span = traceService?.createParentSpan(spanName);

      try {
        const cls = ClsServiceManager.getClsService();
        if (!cls.isActive) {
          cls.enter();
        }

        let store = cls?.get(TRACER);
        if (!store) {
          store = await createStore(TRACER, {}, cls);
        }

        store.span = span;
        updateStore(TRACER, store, cls);

        logger.log('Store: ', store?.span?.spanContext().spanId.toString());
        logger.log('Span: ', span?.spanContext()?.spanId.toString());

        args.push(span);
        return await originalMethod.apply(this, args);
      } catch (err) {
        logger.error(err);
        span?.recordException(err);
        span?.setStatus({ code: SpanStatusCode.ERROR });
      } finally {
        span?.end();
      }
    };
  };
}

function CreateChildSpan(spanConfig: SpanConfig): MethodDecorator {
  const logger = new Logger(CreateSpan.name);
  const { spanName, spanKind } = spanConfig;
  const shouldBindContext = spanConfig.shouldBindContext || false;
  const hasAttributes = spanConfig.hasAttributes || true;

  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    const injector = Inject(TRACE_SERVICE_TOKEN);
    injector(target, 'tracerService');

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const traceService = this.tracerService as ITraceService;
      const cls = ClsServiceManager.getClsService();
      cls.enter();

      let context: Context = null;
      let store: TraceContext = undefined;

      if (shouldBindContext) {
        context = traceService?.extractFromPropagation(args[0]);
        const span = traceService?.getSpanFromContext(context);
        store = await createStore(TRACER, { span }, cls);
      } else {
        store = cls?.get(TRACER);
        if (store) {
          context = traceService.getContextFromSpan(store?.span);
        } else {
          store = {};
        }
      }

      logger.log(
        'Active span: ',
        store?.span?.spanContext()?.spanId.toString(),
      );

      return traceService?.createChildSpan(
        hasAttributes
          ? {
              payload: JSON.stringify(args),
            }
          : {},
        context,
        spanName,
        spanKind,
        async (span?: Span) => {
          try {
            store.span = span;
            updateStore(TRACER, store, cls);

            span?.setStatus({ code: SpanStatusCode.OK });
            args.push(span);

            logger.log(
              'Store: ',
              cls?.get(TRACER)?.span?.spanContext()?.spanId.toString(),
            );

            logger.log('Span: ', span?.spanContext()?.spanId.toString());

            return await originalMethod.apply(this, args);
          } catch (err) {
            logger.error(err);
            span?.recordException(err);
            span?.setStatus({ code: SpanStatusCode.ERROR });
          } finally {
            span?.end();
          }
        },
      );
    };

    return descriptor;
  };
}

/**
 * Create parent span
 * @param {string} spanName
 * @constructor
 */
export function CreateSpan(spanName: string): MethodDecorator;

/**
 * Creatte child span
 * @param {SpanConfig} spanConfig
 * @constructor
 */
export function CreateSpan(spanConfig: SpanConfig): MethodDecorator;

export function CreateSpan(arg: string | SpanConfig): MethodDecorator {
  if (arg && typeof arg === 'string') {
    return CreateParentSpan(arg);
  }
  return CreateChildSpan(arg as unknown as SpanConfig);
}
