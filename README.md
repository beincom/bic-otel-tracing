## Getting started

  ```
  npm install @beincom/otel-tracing
  # yarn add @beincom/otel-tracing
  ```

### Usage

  ```
    # app.module.ts
    @Module({
      imports: [
        TraceModule.forRootAsync({
          useFactory: (configService: ConfigService) => {
            const traceConfig: TraceConfig = {
              collectorUrl: process.env.TRACE_COLLECTOR_URL,
              serviceName: process.env.TRACE_SERVICE_NAME,
              isDebug: process.env.TRACE_DEBUG === 'true',
              isEnabled: process.env.TRACE_ENABLED === 'true',
              concurrencyLimit: parseInt(
                process.env.TRACE_CONCURRENCY_LIMIT || '10'
              ),
              samplerRatio: parseInt(process.env.TRACE_SAMPLER_RATIO || '1'),
              timeout: parseInt(process.env.TRACE_TIMEOUT || '30000'),
            };

            return new TraceService(traceConfig);
          },
          inject: [ConfigService],
        }),
      ],
      providers: [],
      exports: [],
    })
    export class AppModule {}

    # app.controller.ts
    @Controller()
    export class AppController {
      public constructor(
        @Inject(TRACE_SERVICE_TOKEN)
        private readonly _traceService: ITraceService,
      ) {}

      @CreateSpan({
        spanName: 'index',
        spanKind: SpanKind.INTERNAL,
        hasAttribute: false, // default: true
        shouldBindContext: true // default: false
      })
      @Get()
      public async index(
        @Body() body: any,
        span?: Span
      ): Promise<void> {
        // Inject span to body to propagate
        this._traceService.injectToPropagation(body, span);
        return true;
      }
    }
  ```