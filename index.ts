import type { Request, Response } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApiApp } from '../server/app.ts';

const app = createApiApp();

export default function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  const forwardedPath = requestUrl.searchParams.get('__vercel_path');

  if (forwardedPath !== null) {
    requestUrl.searchParams.delete('__vercel_path');

    const remainingQuery = requestUrl.searchParams.toString();

    req.url = `/api/${forwardedPath}${remainingQuery ? `?${remainingQuery}` : ''}`;
  }

  app(req as Request, res as Response);
}
