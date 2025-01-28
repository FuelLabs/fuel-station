import { test, describe } from 'bun:test';
import jwt from 'jsonwebtoken';
import { envSchema } from '../src/lib';

describe('utils', () => {
  const { JWT_PRIVATE_KEY } = envSchema.parse(process.env);

  test('token generation and verification', () => {
    const token = jwt.sign(
      {
        token: crypto.randomUUID(),
      },
      JWT_PRIVATE_KEY
    );

    jwt.verify(token, JWT_PRIVATE_KEY);
  });
});
