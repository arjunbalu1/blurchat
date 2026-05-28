import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import pinoHttp from 'pino-http';
import { LoggerModule, pinoHttpOptions } from '@chatarooni/logger';

import { auth } from '../auth';

// Better Auth's handler is mounted via httpAdapter.use() and short-circuits
// /api/auth/* before reaching nestjs-pino's request logger — so those routes
// would otherwise be invisible. The `middleware` option wraps the auth handler
// (auth routes only) with pino-http using the SAME redacting config, so auth
// requests log consistently and session tokens / OAuth codes stay redacted.
@Module({
  imports: [
    LoggerModule.forRoot(),
    AuthModule.forRoot({ auth, middleware: pinoHttp(pinoHttpOptions) }),
  ],
})
export class AppModule {}
