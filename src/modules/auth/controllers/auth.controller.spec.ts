import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import type { Mocked } from 'jest-mock';
import { PrincipalMapper } from '../../../common/authorization/mapper/principal.mapper.js';
import { AuthenticationCookieService } from '../services/authentication-cookie.service.js';
import { AuthenticationService } from '../services/authentication.service.js';
import { AuthenticationController } from './auth.controller.js';

const authentication = {
  login: jest.fn(),
  loginWithApiKey: jest.fn(),
  verifyMfa: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  logoutAllSessions: jest.fn(),
  changePassword: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  createApiKey: jest.fn(),
  listApiKeys: jest.fn(),
  revokeApiKeyById: jest.fn(),
} as unknown as Mocked<
  Pick<
    AuthenticationService,
    | 'login'
    | 'loginWithApiKey'
    | 'verifyMfa'
    | 'refresh'
    | 'logout'
    | 'logoutAllSessions'
    | 'changePassword'
    | 'forgotPassword'
    | 'resetPassword'
    | 'createApiKey'
    | 'listApiKeys'
    | 'revokeApiKeyById'
  >
>;

const principalMapper = { toResponse: jest.fn() };
const authenticationCookies = {
  get: jest.fn(),
  setAuthenticationCookies: jest.fn(),
  setRefreshTokenCookie: jest.fn(),
  clearAuthenticationCookies: jest.fn(),
};
const principal = {
  sessionId: 'session-id',
  userId: 'user-id',
  clientId: 'client-id',
  username: 'alice',
  email: 'alice@example.test',
  firstName: 'Alice',
  lastName: 'Doe',
  active: true,
  locked: false,
  mfaEnabled: false,
  roles: [],
};

describe('AuthenticationController', () => {
  let controller: AuthenticationController;

  beforeEach(async () => {
    jest.clearAllMocks();
    authenticationCookies.get.mockImplementation((request, name) => {
      const prefix = `${name}=`;
      return request.headers.cookie
        ?.split(';')
        .map((part: string) => part.trim())
        .find((part: string) => part.startsWith(prefix))
        ?.slice(prefix.length);
    });
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        { provide: AuthenticationService, useValue: authentication },
        { provide: PrincipalMapper, useValue: principalMapper },
        {
          provide: AuthenticationCookieService,
          useValue: authenticationCookies,
        },
      ],
    }).compile();
    controller = module.get(AuthenticationController);
  });

  describe('login', () => {
    it('requires x-client-id', async () => {
      await expect(
        controller.login(
          { identifier: 'alice', password: 'secret' },
          undefined,
          {} as Response,
          '127.0.0.1',
          'agent',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns the MFA challenge without setting cookies', async () => {
      const result = {
        requiresMfa: true,
        verificationToken: 'token',
        expiresAt: new Date('2099-01-01'),
      };
      authentication.login.mockResolvedValue(result as any);
      await expect(
        controller.login(
          { identifier: 'alice', password: 'secret' },
          'client-id',
          {} as Response,
          '127.0.0.1',
          'agent',
        ),
      ).resolves.toEqual(result);
      expect(authentication.login).toHaveBeenCalledWith(
        'alice',
        'secret',
        'client-id',
        '127.0.0.1',
        'agent',
        undefined,
      );
    });

    it('sets session and refresh cookies on success', async () => {
      authentication.login.mockResolvedValue({
        requiresMfa: false,
        sessionId: 'session-id',
        sessionToken: 'session-token',
        refreshToken: 'refresh-token',
        refreshTokenExpiresAt: new Date('2099-01-01'),
      } as any);
      const response = { cookie: jest.fn() } as unknown as Response;
      await expect(
        controller.login(
          { identifier: 'alice', password: 'secret' },
          'client-id',
          response,
          '127.0.0.1',
          'agent',
        ),
      ).resolves.toEqual({ requiresMfa: false, sessionId: 'session-id' });
      expect(
        authenticationCookies.setAuthenticationCookies,
      ).toHaveBeenCalledWith(
        response,
        expect.objectContaining({
          sessionToken: 'session-token',
          refreshToken: 'refresh-token',
        }),
      );
    });
  });

  it('delegates API-key login and requires a client id', async () => {
    authentication.loginWithApiKey.mockResolvedValue({
      apiKeyId: 'key-id',
    } as any);
    await expect(
      controller.loginWithApiKey(
        { apiKey: 'pk_test.key' },
        'client-id',
        '127.0.0.1',
        'agent',
      ),
    ).resolves.toEqual({ apiKeyId: 'key-id' });
    expect(authentication.loginWithApiKey).toHaveBeenCalledWith(
      'pk_test.key',
      'client-id',
      '127.0.0.1',
      'agent',
    );
    await expect(
      controller.loginWithApiKey(
        { apiKey: 'pk_test.key' },
        undefined,
        '127.0.0.1',
        'agent',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('verifies MFA, sets cookies, and returns the session id', async () => {
    authentication.verifyMfa.mockResolvedValue({
      sessionId: 'session-id',
      sessionToken: 'session-token',
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: new Date('2099-01-01'),
    } as any);
    const response = {} as Response;
    await expect(
      controller.verifyMfa(
        { verificationToken: 'token', code: '123456', rememberDevice: false },
        'client-id',
        response,
        '127.0.0.1',
        'agent',
      ),
    ).resolves.toEqual({ sessionId: 'session-id' });
    expect(authentication.verifyMfa).toHaveBeenCalledWith(
      'token',
      '123456',
      'client-id',
      '127.0.0.1',
      'agent',
    );
    expect(authenticationCookies.setAuthenticationCookies).toHaveBeenCalledWith(
      response,
      expect.objectContaining({ sessionToken: 'session-token' }),
    );
  });

  describe('authenticated endpoints', () => {
    it('refreshes from the refresh cookie for the current principal', async () => {
      authentication.refresh.mockResolvedValue({
        refreshToken: 'new-token',
        refreshTokenExpiresAt: new Date('2099-01-01'),
      } as any);
      const response = {} as Response;
      await controller.refresh(
        principal,
        { headers: { cookie: 'other=x; refreshToken=old-token' } } as any,
        response,
        '127.0.0.1',
        'agent',
      );
      expect(authentication.refresh).toHaveBeenCalledWith(
        'old-token',
        'user-id',
        'client-id',
        '127.0.0.1',
        'agent',
      );
      expect(authenticationCookies.setRefreshTokenCookie).toHaveBeenCalledWith(
        response,
        'new-token',
        expect.any(Date),
      );
    });

    it('requires a refresh token cookie', async () => {
      await expect(
        controller.refresh(
          principal,
          { headers: {} } as any,
          {} as Response,
          '127.0.0.1',
          'agent',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('logs out the current session and clears cookies', async () => {
      const response = {} as Response;
      await controller.logout(principal, response, '127.0.0.1', 'agent');
      expect(authentication.logout).toHaveBeenCalledWith(
        'session-id',
        'user-id',
        'client-id',
        '127.0.0.1',
        'agent',
      );
      expect(
        authenticationCookies.clearAuthenticationCookies,
      ).toHaveBeenCalledWith(response);
    });

    it('logs out all sessions for the current principal', async () => {
      const response = {} as Response;
      await controller.logoutAll(principal, response, '127.0.0.1', 'agent');
      expect(authentication.logoutAllSessions).toHaveBeenCalledWith(
        'user-id',
        'client-id',
        '127.0.0.1',
        'agent',
      );
      expect(
        authenticationCookies.clearAuthenticationCookies,
      ).toHaveBeenCalledWith(response);
    });

    it('maps the current principal for me', async () => {
      principalMapper.toResponse.mockReturnValue({ id: 'user-id' });
      await expect(controller.me(principal)).resolves.toEqual({
        id: 'user-id',
      });
      expect(principalMapper.toResponse).toHaveBeenCalledWith(principal);
    });

    it('changes password when confirmation matches', async () => {
      await controller.changePassword(
        { currentPassword: 'old', newPassword: 'new', confirmPassword: 'new' },
        principal,
        '127.0.0.1',
        'agent',
      );
      expect(authentication.changePassword).toHaveBeenCalledWith(
        'user-id',
        'old',
        'new',
        'client-id',
        '127.0.0.1',
        'agent',
      );
    });

    it('rejects a mismatched password confirmation', async () => {
      await expect(
        controller.changePassword(
          {
            currentPassword: 'old',
            newPassword: 'new',
            confirmPassword: 'different',
          },
          principal,
          '127.0.0.1',
          'agent',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates, lists without secret hashes, and revokes API keys for the current principal', async () => {
      authentication.createApiKey.mockResolvedValue({ id: 'key-id' } as any);
      authentication.listApiKeys.mockResolvedValue([
        { id: 'key-id', secretHash: 'hash' },
      ] as any);
      await controller.createApiKey(
        { name: 'Key', expiresAt: '2099-01-01T00:00:00Z' },
        principal,
        '127.0.0.1',
        'agent',
      );
      await expect(controller.listApiKeys(principal)).resolves.toEqual([
        { id: 'key-id' },
      ]);
      await controller.revokeApiKey('key-id', principal, '127.0.0.1', 'agent');
      expect(authentication.createApiKey).toHaveBeenCalledWith(
        'client-id',
        'Key',
        'user-id',
        'SESSION',
        new Date('2099-01-01T00:00:00Z'),
        '127.0.0.1',
        'agent',
      );
      expect(authentication.revokeApiKeyById).toHaveBeenCalledWith(
        'key-id',
        'client-id',
        'user-id',
        '127.0.0.1',
        'agent',
      );
    });
  });

  it('handles forgot and reset password requests', async () => {
    await expect(
      controller.forgotPassword({ identifier: 'alice' }, 'client-id'),
    ).resolves.toEqual({
      success: true,
      message:
        'If an account matches the supplied identifier, a verification code has been sent.',
    });
    await controller.resetPassword(
      {
        token: 'token',
        code: '123456',
        password: 'new',
        confirmPassword: 'new',
      },
      'client-id',
      '127.0.0.1',
      'agent',
    );
    expect(authentication.forgotPassword).toHaveBeenCalledWith(
      'alice',
      'client-id',
    );
    expect(authentication.resetPassword).toHaveBeenCalledWith(
      'token',
      '123456',
      'new',
      'client-id',
      '127.0.0.1',
      'agent',
    );
  });
});
