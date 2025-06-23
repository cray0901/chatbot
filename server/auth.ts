import express from 'express';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { storage } from './storage';
import { emailService } from './email';
import {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  newPasswordSchema,
  type User,
} from '@shared/schema';
import crypto from 'crypto';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

export const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
};

export const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.session && req.session.userId && req.user?.isAdmin) {
    return next();
  }
  return res.status(403).json({ message: 'Admin access required' });
};

export const loadUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.session && req.session.userId) {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user && user.isActive) {
        req.user = user;
      } else {
        // User is inactive or deleted
        req.session.destroy(() => {});
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }
  next();
};

export function setupAuthRoutes(app: express.Application) {
  // Apply session middleware
  app.use(getSession());
  
  // Load user for all requests
  app.use(loadUser);

  // Register route
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create user
      const user = await storage.createUser(validatedData);
      
      // Send verification email if email service is enabled
      if (emailService.isEnabled() && user.verificationToken) {
        await emailService.sendVerificationEmail(
          user.email, 
          user.firstName || 'User', 
          user.verificationToken
        );
      } else {
        // If email service is not enabled, activate user immediately
        await storage.updateUser(user.id, { 
          isActive: true, 
          emailVerified: true,
          verificationToken: null 
        });
      }

      res.status(201).json({ 
        message: emailService.isEnabled() 
          ? 'Registration successful. Please check your email to verify your account.'
          : 'Registration successful. You can now log in.',
        emailVerificationRequired: emailService.isEnabled()
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: 'Registration failed' });
    }
  });

  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.verifyPassword(validatedData.email, validatedData.password);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      if (!user.isActive) {
        return res.status(401).json({ 
          message: emailService.isEnabled() && !user.emailVerified
            ? 'Please verify your email address before logging in'
            : 'Account is disabled. Please contact administrator.'
        });
      }

      // Create session
      req.session.userId = user.id;
      req.user = user;

      res.json({ 
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          isAdmin: user.isAdmin,
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ message: 'Login failed' });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  });

  // Get current user
  app.get('/api/auth/user', isAuthenticated, (req, res) => {
    res.json({
      id: req.user!.id,
      email: req.user!.email,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName,
      profileImageUrl: req.user!.profileImageUrl,
      isAdmin: req.user!.isAdmin,
      tokenQuota: req.user!.tokenQuota,
      tokenUsed: req.user!.tokenUsed,
    });
  });

  // Email verification route
  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: 'Invalid verification token' });
      }

      // Find user by verification token
      const users = await storage.getAllUsers();
      const user = users.find(u => u.verificationToken === token);
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired verification token' });
      }

      // Activate user
      await storage.updateUser(user.id, {
        isActive: true,
        emailVerified: true,
        verificationToken: null,
      });

      res.json({ message: 'Email verified successfully. You can now log in.' });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ message: 'Email verification failed' });
    }
  });

  // Request password reset
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
      }

      if (!emailService.isEnabled()) {
        return res.status(400).json({ message: 'Password reset via email is not available. Please contact administrator.' });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.updateUser(user.id, {
        resetToken,
        resetTokenExpiry,
      });

      // Send reset email
      await emailService.sendPasswordResetEmail(
        user.email,
        user.firstName || 'User',
        resetToken
      );

      res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ message: 'Password reset request failed' });
    }
  });

  // Reset password with token
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const validatedData = newPasswordSchema.parse(req.body);
      
      // Find user by reset token
      const users = await storage.getAllUsers();
      const user = users.find(u => 
        u.resetToken === validatedData.token && 
        u.resetTokenExpiry && 
        u.resetTokenExpiry > new Date()
      );

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      // Update password and clear reset token
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

      res.json({ message: 'Password reset successful. You can now log in with your new password.' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(400).json({ message: 'Password reset failed' });
    }
  });
}

// Extend session data interface
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}