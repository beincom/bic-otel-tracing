import { DynamicModule, Global, Module, Provider } from '@nestjs/common';

import { TraceService } from './trace.service';
import { TRACE_SERVICE_TOKEN } from './interfaces';
import { TraceConfig } from './type';
import { ClsModule } from 'nestjs-cls';
import {
  ITraceModuleAsyncOptions,
  ITraceModuleModuleOptionsFactory,
} from './interfaces/trace-module.interface';

@Global()
@Module({})
export class TraceModule {
  public static forRoot(config: TraceConfig): DynamicModule {
    return {
      module: TraceModule,
      imports: [
        ClsModule.forRoot({
          global: true,
          interceptor: {
            mount: true,
            generateId: true,
          },
        }),
      ],
      providers: [
        {
          provide: TRACE_SERVICE_TOKEN,
          useFactory: async () => {
            return new TraceService(config);
          },
        },
      ],
      exports: [TRACE_SERVICE_TOKEN],
    };
  }

  public static forRootAsync(options: ITraceModuleAsyncOptions): DynamicModule {
    return {
      module: TraceModule,
      imports: [
        ClsModule.forRoot({
          global: true,
          interceptor: {
            mount: true,
            generateId: true,
          },
        }),
        ...(options.imports || []),
      ],
      providers: [
        ...this._createAsyncProviders(options),
        ...(options.extraProviders || []),
      ],
      exports: [
        ...this._createAsyncProviders(options),
        ...(options.extraProviders || []),
      ],
    };
  }

  private static _createAsyncProviders(
    options: ITraceModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this._createAsyncOptionsProvider(options)];
    }
    return [
      this._createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static _createAsyncOptionsProvider(
    options: ITraceModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: TRACE_SERVICE_TOKEN,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      provide: TRACE_SERVICE_TOKEN,
      useFactory: async (optionsFactory: ITraceModuleModuleOptionsFactory) =>
        optionsFactory.createOptions(),
      inject: [options.useExisting || options.useClass],
    };
  }
}
