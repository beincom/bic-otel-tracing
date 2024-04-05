import { Inject, Logger } from '@nestjs/common';
import { Span } from '@opentelemetry/api';
import { ClsService, ClsServiceManager } from 'nestjs-cls';

import { TraceContext } from '../type';
import { ITraceService, TRACE_SERVICE_TOKEN } from '../interfaces';
import { TRACER } from '../constants';

export function InjectSpan(): MethodDecorator {
  const logger = new Logger(InjectSpan.name);

  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    let injector = Inject(TRACE_SERVICE_TOKEN);
    injector(target, 'tracerService');

    injector = Inject(ClsService);
    injector(target, 'cls');

    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const traceService = this.tracerService as ITraceService;
      const cls = ClsServiceManager.getClsService();
      cls.enter();

      const store = cls?.get(TRACER) as TraceContext;

      logger.log('Store: ', store?.span?.spanContext()?.spanId.toString());

      const span: Span = store?.span;

      logger.log('Span: ', span?.spanContext().spanId.toString());
      traceService?.injectToPropagation(args, span);

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
