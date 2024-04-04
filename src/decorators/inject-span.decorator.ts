import { Inject, Logger } from '@nestjs/common';
import { Span } from '@opentelemetry/api';
import { ClsService, ClsServiceManager } from 'nestjs-cls';

import { TraceContext } from '../type';
import { ITraceService, TRACE_SERVICE_TOKEN } from '../interfaces';
import { TRACER } from '../constants';
import { ModuleRef } from '@nestjs/core';

export function InjectSpan(): MethodDecorator {
  const logger = new Logger(InjectSpan.name);

  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    let injector = Inject(TRACE_SERVICE_TOKEN);
    injector(target, 'tracerService');

    injector = Inject(ClsService);
    injector(target, 'cls');

    injector = Inject(ModuleRef);
    injector(target, 'moduleRef');

    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      logger.log('Inject span - traceService: ', this.tracerService);
      logger.log('Inject span - moduleRef: ', this.moduleRef);

      const traceService = this.tracerService as ITraceService;
      const cls = ClsServiceManager.getClsService();
      cls.enter();

      const store = cls?.get(TRACER) as TraceContext;

      logger.log(
        'Inject span - store: ',
        store?.span?.spanContext()?.spanId.toString(),
      );

      const span: Span = store?.span;

      logger.log('Inject span - span: ', span?.spanContext().spanId.toString());
      traceService?.injectToPropagation(args, span);

      const context = traceService?.extractFromPropagation(args);
      const span1 = traceService?.getSpanFromContext(context);
      logger.log(
        'Inject span - span1: ',
        span1?.spanContext().spanId.toString(),
      );

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
