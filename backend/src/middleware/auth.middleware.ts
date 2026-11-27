import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isObjectIdOrHexString } from 'mongoose';
import { getJwtSecret } from '../config/auth';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: { userId: string }
        }
    }
}

export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const authorization = req.header('Authorization');
    if (!authorization) {
        res.status(401).json({
            success: false,
            message: 'No authentication token, access denied'
        });
        return;
    }

    const secret = getJwtSecret();
    if (!secret) {
        res.status(503).json({ success: false, message: 'Authentication is unavailable' });
        return;
    }

    try {
        const [, token] = /^Bearer +([^\s]+)$/i.exec(authorization) ?? [];
        const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
        if (typeof decoded === 'string' || typeof decoded.userId !== 'string' ||
            !isObjectIdOrHexString(decoded.userId) || typeof decoded.exp !== 'number') {
            res.status(401).json({ success: false, message: 'Token is not valid' });
            return;
        }
        req.user = { userId: decoded.userId };
    } catch {
        res.status(401).json({ success: false, message: 'Token is not valid' });
        return;
    }
    next();
};
