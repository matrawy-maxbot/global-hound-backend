import { Request, Response, NextFunction, RequestHandler } from 'express';
import status from '../../config/status.config.js';
import Joi, { Schema, ObjectSchema } from 'joi';

type ValidationType = 'params' | 'query' | 'body' | 'file' | 'files' | 'headers';

interface ValidatedValues {
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    file?: unknown;
    files?: unknown;
    headers?: Record<string, unknown>;
}

interface ExtendedRequest extends Request {
    type?: ValidationType;
    schema?: Schema | Record<string, Joi.SchemaLike>;
    value?: ValidatedValues;
}

const validationMiddleware = (req: ExtendedRequest, res: Response, next: NextFunction): void => {

    if(!req.type) {
        res.status(status.BAD_REQUEST);
        return next(new Error('Type is required'));
    }

    if(!req.value) req.value = {};

    // Set the validation target based on type
    let validationTarget: unknown;
    if(req.type === 'params') {
        validationTarget = req.params;
    } else if(req.type === 'query') {
        validationTarget = req.query;
    } else if(req.type === 'body') {
        validationTarget = req.body;
    } else if(req.type === 'headers') {
        validationTarget = req.headers;
    } else {
        res.status(status.BAD_REQUEST);
        return next(new Error('Type is not supported'));
    }

    if(!req.schema) {
        res.status(status.BAD_REQUEST);
        return next(new Error('Schema is required'));
    }

    const schemaObj = req.schema as ObjectSchema | Record<string, Joi.SchemaLike>;
    const schema: ObjectSchema = 'unknown' in schemaObj && typeof (schemaObj as ObjectSchema).unknown === 'function' 
        ? (schemaObj as ObjectSchema).unknown() 
        : Joi.object(schemaObj as Record<string, Joi.SchemaLike>).unknown();
    
    const { error, value } = schema.validate(validationTarget, { abortEarly: false });
  
    if (error) {
        res.status(status.BAD_REQUEST);
        return next(new Error(error.details.map((err) => err.message).join(', ')));
    }

    // Store validated values back to req for use in controllers
    if(!req.value) req.value = {};
    
    if(req.type === 'params') {
        req.value.params = value;
        // Also update req.params with validated values
        req.params = value;
    } else if(req.type === 'query') {
        req.value.query = value;
        req.query = value;
    } else if(req.type === 'body') {
        req.value.body = value;
        req.body = value;
    } else if(req.type === 'headers') {
        req.value.headers = value;
    }
  
    next();
};

const validationMiddlewareFactory = (
    schema: Schema | Record<string, Joi.SchemaLike>, 
    type: ValidationType
): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const extendedReq = req as ExtendedRequest;
        extendedReq.schema = schema;
        extendedReq.type = type;
        validationMiddleware(extendedReq, res, next);
    };
};

export default validationMiddlewareFactory;
