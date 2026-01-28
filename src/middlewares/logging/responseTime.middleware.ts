import { Request, Response } from 'express';
import responseTime from 'response-time';

const responseTimeMiddleware = responseTime((req: Request, res: Response, time: number): void => {
  console.log(`[Response Time] ${req.method} ${req.url} - ${time.toFixed(2)}ms`);
});

export default responseTimeMiddleware;
