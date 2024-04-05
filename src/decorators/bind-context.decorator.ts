import { Inject, Logger } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';

import { createStore } from '../utils';

import { ITraceService, TRACE_SERVICE_TOKEN } from '../interfaces';
import { TRACER } from '../constants';

export function BindContext(): MethodDecorator {
  const logger = new Logger(BindContext.name);

  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    const injector = Inject(TRACE_SERVICE_TOKEN);
    injector(target, 'tracerService');

    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const traceService = this.tracerService as ITraceService;
      const cls = ClsServiceManager.getClsService();
      cls.enter();

      const context = traceService?.extractFromPropagation(args[0]);
      const span = traceService?.getSpanFromContext(context);

      logger.log('Active span: ', span?.spanContext()?.spanId.toString());
      const store = createStore(TRACER, { span }, cls);
      logger.log('Store: ', store?.span?.spanContext()?.spanId.toString());

      args.push(span);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
