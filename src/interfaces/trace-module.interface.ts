import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import { TraceService } from '../trace.service';

export interface ITraceModuleModuleOptionsFactory {
  createOptions(): Promise<TraceService> | TraceService;
}

export interface ITraceModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<ITraceModuleModuleOptionsFactory>;
  useClass?: Type<ITraceModuleModuleOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<TraceService> | TraceService;
  inject?: any[];
  extraProviders?: Provider[];
}
