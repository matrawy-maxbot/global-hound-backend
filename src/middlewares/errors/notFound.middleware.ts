import { Request, Response, NextFunction } from 'express';
import status from '../../config/status.config.js';

const notFoundMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    res.status(status.NOT_FOUND);
    next(new Error(`${status.NOT_FOUND} Not Found - ${req.originalUrl}`));
};

export default notFoundMiddleware;
