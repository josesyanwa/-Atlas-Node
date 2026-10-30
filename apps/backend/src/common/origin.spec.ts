import { normalizeOrigin } from './origin';

describe('normalizeOrigin', () => {
  it('removes a trailing slash and path from a configured URL', () => {
    expect(normalizeOrigin('https://app.example.com/')).toBe(
      'https://app.example.com',
    );
    expect(normalizeOrigin('https://app.example.com/sign-up')).toBe(
      'https://app.example.com',
    );
  });
});
