import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export interface SwaggerOptions {
  title: string;
  version?: string;
  path?: string;
}

// dev-only OpenAPI/Swagger UI for a Nest app's controllers
export function setupSwagger(
  app: INestApplication,
  options: SwaggerOptions,
): void {
  if (process.env.NODE_ENV === 'production') return;

  const config = new DocumentBuilder()
    .setTitle(options.title)
    .setVersion(options.version ?? '1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(options.path ?? 'docs', app, document, {
    useGlobalPrefix: true,
  });
}
