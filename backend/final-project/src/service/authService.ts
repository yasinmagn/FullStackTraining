import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { ConflictError, UnauthorizedError, type LoginInput, type RegisterInput, type Role, type User } from '../domain/index.ts';
import type { UserRepository } from '../repository/userRepository.ts';
import type { Config } from '../config/index.ts';

/**
 * AUTHENTICATION.
 *
 * Everything here is covered in detail by Backend Stage 6; the comments below
 * mark the decisions rather than re-explaining them.
 */

const BCRYPT_COST = 12;

/**
 * A throwaway hash so an unknown email costs the same as a known one.
 *
 * Without it, login returns in ~1ms for an unknown address and ~200ms for a
 * real one, and an attacker enumerates your whole user list by timing alone.
 */
const DUMMY_HASH = bcrypt.hashSync('a-password-that-is-never-correct', BCRYPT_COST);

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  jti: string;
}

export interface AuthService {
  register(input: RegisterInput): Promise<{ user: User; accessToken: string }>;
  login(input: LoginInput): Promise<{ user: User; accessToken: string }>;
  verifyToken(token: string): AccessTokenPayload;
  getUser(id: string): Promise<User>;
}

export function createAuthService(users: UserRepository, config: Config): AuthService {
  const signOptions = {
    algorithm: 'HS256' as const,
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'fullstack-training',
    audience: 'fullstack-training-api',
  };

  const issue = (user: { id: string; email: string; role: Role }): string =>
    jwt.sign(
      { sub: user.id, email: user.email, role: user.role, jti: randomUUID() },
      config.JWT_SECRET,
      signOptions,
    );

  return {
    async register(input) {
      if (await users.findByEmail(input.email)) {
        throw new ConflictError('An account with that email already exists', {
          email: 'already registered',
        });
      }

      const created = await users.create({
        email: input.email,
        displayName: input.displayName,
        passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
        // The SERVER sets the role. Reading it from the request body would be
        // instant privilege escalation for anyone who read the API docs.
        role: 'user',
      });

      return { user: toPublicUser(created), accessToken: issue(created) };
    },

    async login(input) {
      const user = await users.findByEmail(input.email);

      // Constant-ish time: the same bcrypt work runs whether or not the
      // account exists.
      const valid = await bcrypt
        .compare(input.password, user?.passwordHash ?? DUMMY_HASH)
        .catch(() => false);

      if (!user || !valid) {
        // ONE message for both cases. "No such user" vs "wrong password" is a
        // free account-existence oracle.
        throw new UnauthorizedError('Invalid email or password');
      }

      return { user: toPublicUser(user), accessToken: issue(user) };
    },

    verifyToken(token) {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET, {
          /*
           * The algorithm allow-list closes the confusion attacks: alg:"none",
           * and signing with a public key against an RS256 setup. Without it a
           * library may honour the `alg` field the ATTACKER controls.
           */
          algorithms: ['HS256'],
          issuer: signOptions.issuer,
          audience: signOptions.audience,
        });

        if (typeof decoded === 'string' || !decoded.sub) {
          throw new UnauthorizedError('Invalid token');
        }

        return {
          sub: decoded.sub,
          email: String(decoded.email ?? ''),
          role: decoded.role === 'admin' ? 'admin' : 'user',
          jti: String(decoded.jti ?? ''),
        };
      } catch (error) {
        if (error instanceof UnauthorizedError) throw error;
        if (error instanceof jwt.TokenExpiredError) {
          // Distinguished so the client knows to refresh rather than to bounce
          // the user to a login screen.
          throw new UnauthorizedError('Token has expired');
        }
        throw new UnauthorizedError('Invalid token');
      }
    },

    async getUser(id) {
      const user = await users.findById(id);
      // A valid token for a deleted account.
      if (!user) throw new UnauthorizedError('Account no longer exists');
      return toPublicUser(user);
    },
  };
}

/**
 * An ALLOW-LIST projection, not `delete user.passwordHash`.
 *
 * Add a `resetToken` column later and a deny-list would silently start leaking
 * it. Here, new fields are private until you say otherwise.
 */
function toPublicUser(user: { id: string; email: string; displayName: string; role: Role; createdAt: string }): User {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
  };
}
