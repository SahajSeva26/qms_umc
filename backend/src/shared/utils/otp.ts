// OTP utility — generates numeric one-time passwords.
import crypto from 'crypto';

export class OtpHandler {
    // Generate a numeric OTP of `length` digits (default 6). Uses crypto for unbiased randomness;
    // leading zeros are preserved by returning a zero-padded string (e.g. '004213').
    static generate(length: number = 6): string {
        if (length < 1) {
            throw new Error('OTP length must be at least 1');
        }
        const max = 10 ** length;
        const num = crypto.randomInt(0, max);
        return num.toString().padStart(length, '0');
    }
}
