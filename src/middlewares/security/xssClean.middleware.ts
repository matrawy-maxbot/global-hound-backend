import xssClean from 'xss-clean';
import { RequestHandler } from 'express';

const xssProtectionMiddleware: RequestHandler = xssClean();

export default xssProtectionMiddleware;
