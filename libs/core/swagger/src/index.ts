import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export interface SwaggerServer {
  url: string;
  description?: string;
}

export interface SwaggerOptions {
  title: string;
  description?: string;
  version?: string;
  path?: string;
  servers?: SwaggerServer[]; // overrides the defaults below
}

// dev-only OpenAPI/Swagger UI for a Nest app's controllers
export function setupSwagger(
  app: INestApplication,
  options: SwaggerOptions,
): void {
  if (process.env.NODE_ENV === 'production') return;

  const builder = new DocumentBuilder()
    .setTitle(options.title)
    .setVersion(options.version ?? '1.0')
    .addBearerAuth();

  if (options.description) builder.setDescription(options.description);

  const servers = options.servers ?? [
    {
      url: `http://localhost:${process.env.PORT ?? '3000'}`,
      description: 'Local',
    },
    { url: 'https://blurchat.up.railway.app', description: 'Production' },
  ];
  for (const server of servers) {
    builder.addServer(server.url, server.description);
  }

  const document = SwaggerModule.createDocument(app, builder.build());
  SwaggerModule.setup(options.path ?? 'docs', app, document, {
    useGlobalPrefix: true,
    swaggerOptions: { persistAuthorization: true },
  });
}
