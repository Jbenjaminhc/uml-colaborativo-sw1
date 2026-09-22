process.env.JWT_SECRET = 'test';
// MongoDB 4.4 requires libcrypto.so.1.1, which is unavailable on current
// GitHub-hosted Ubuntu runners. MongoDB 6 uses the available OpenSSL version.
process.env.MONGOMS_VERSION = '6.0.14';
