// WebSocket authentication with graceful fallback
import jwt from 'jsonwebtoken';
import { Socket } from "socket.io";

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function socketAuth(
  socket: Socket,
  next: (err?: Error) => void
) {
  try {
    const token =
      socket.handshake.auth.token ??
      socket.handshake.headers.authorization?.split(" ")[1];

    console.log('🔐 WebSocket auth attempt:', {
      authToken: !!socket.handshake.auth.token,
      headerAuth: !!socket.handshake.headers.authorization,
      token: token ? token.substring(0, 20) + '...' : 'none'
    });

    if (!token) {
      console.log('❌ No token provided, creating anonymous user');
      // Graceful fallback - create anonymous user
      socket.data.user = { userId: 'dev-user-' + Date.now() };
      next();
      return;
    }

    // Try to verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    socket.data.user = { userId: decoded.userId };
    
    console.log('✅ WebSocket auth successful for user:', decoded.userId);
    next();
  } catch (error) {
    console.log('❌ WebSocket auth failed, falling back to anonymous user:', error instanceof Error ? error.message : String(error));
    // Graceful fallback - create anonymous user instead of blocking
    socket.data.user = { userId: 'dev-user-' + Date.now() };
    next();
  }
}
