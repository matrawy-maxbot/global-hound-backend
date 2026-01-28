import { Request, Response, NextFunction, RequestHandler } from 'express';
import status from '../../../config/status.config.js';

export interface AuthenticatedUser {
    userID: string;
    email?: string;
    username?: string;
    isSystemClient: boolean;
    role: 'owner' | 'admin' | 'user' | 'guest';
    permissions: string[] | Record<string, boolean>;
}

export interface AuthenticatedRequest extends Request {
    user?: AuthenticatedUser;
}

type UserRole = 'owner' | 'admin' | 'user' | 'guest';

/**
 * Middleware to check user roles and permissions
 * @param roles - Array of allowed roles ['owner', 'admin', 'user']
 * @param adminPermissions - Array of required admin permissions
 * @returns Express RequestHandler
 */
export const checkRole = (
    roles: UserRole[] = [], 
    adminPermissions: string[] = []
): RequestHandler => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        const userRole = req.user?.role || 'guest';

        // Check if user has required role (Hierarchy support: Owner > Admin > User > Guest)
        const isAuthorized = roles.includes(userRole) || 
                            (userRole === 'owner' && (roles.includes('admin') || roles.includes('user') || roles.includes('guest'))) ||
                            (userRole === 'admin' && (roles.includes('user') || roles.includes('guest'))) ||
                            (userRole === 'user' && roles.includes('guest'));

        if (!isAuthorized) {
            res.status(status.FORBIDDEN).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(', ')}`,
                error: 'MISSING_ROLE'
            });
            return;
        }

        // Bypass permission checks for Owners
        if (userRole === 'owner') {
            next();
            return;
        }

        // Check admin permissions if required
        if (roles.includes('admin') && userRole === 'admin' && adminPermissions.length > 0) {
            const permissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
            
            const hasAllPermissions = adminPermissions.every(perm => permissions.includes(perm));
            if (!hasAllPermissions) {
                res.status(status.FORBIDDEN).json({
                    success: false,
                    message: `Access denied. Missing permissions: ${adminPermissions.join(', ')}`,
                    error: 'MISSING_PERMISSIONS'
                });
                return;
            }
        }
        next();
    };
};
