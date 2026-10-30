import { describe, it } from 'node:test';
import assert from 'node:assert';
import { render } from '@react-email/render';
import { OtpEmail } from '../otp-email';

describe('OtpEmail render integration', () => {
  const otp = '847291';

  it('renders email-verification HTML with OTP code', async () => {
    const html = await render(
      OtpEmail({
        otp,
        heading: 'Verify your email',
        description: 'Enter this code to verify your email address.',
      }),
    );
    assert.ok(html.includes(otp), 'HTML should contain the OTP code');
    assert.ok(
      html.includes('Atlas Node'),
      'HTML should contain Atlas Node branding',
    );
    assert.ok(
      html.includes('Verify your email'),
      'HTML should contain the heading',
    );
  });

  it('renders sign-in HTML with correct heading', async () => {
    const html = await render(
      OtpEmail({
        otp,
        heading: 'Sign in to Atlas Node',
        description: 'Enter this code to sign in to your account.',
      }),
    );
    assert.ok(html.includes(otp), 'HTML should contain the OTP code');
    assert.ok(
      html.includes('Sign in to Atlas Node'),
      'HTML should contain the heading',
    );
  });

  it('renders password-reset HTML with correct heading', async () => {
    const html = await render(
      OtpEmail({
        otp,
        heading: 'Reset your password',
        description: 'Enter this code to reset your password.',
      }),
    );
    assert.ok(html.includes(otp), 'HTML should contain the OTP code');
    assert.ok(
      html.includes('Reset your password'),
      'HTML should contain the heading',
    );
  });

  it('renders plain text with OTP code', async () => {
    const text = await render(
      OtpEmail({
        otp,
        heading: 'Verify your email',
        description: 'Enter this code to verify your email address.',
      }),
      { plainText: true },
    );
    assert.ok(text.includes(otp), 'Plain text should contain the OTP code');
    assert.ok(
      text.includes('Atlas Node'),
      'Plain text should contain Atlas Node branding',
    );
  });

  it('renders valid HTML document', async () => {
    const html = await render(
      OtpEmail({
        otp,
        heading: 'Verify your email',
        description: 'Enter this code to verify your email address.',
      }),
    );
    assert.ok(
      html.includes('<!DOCTYPE html'),
      'HTML should start with doctype',
    );
    assert.ok(html.includes('</html>'), 'HTML should close html tag');
  });
});
