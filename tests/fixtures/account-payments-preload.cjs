// TEST PROCESS ONLY. No application import or production environment switch.
if (process.env.ACCOUNT_PAYMENTS_FIXTURE !== '1' || process.env.VERCEL_ENV === 'production' ||
    process.env.STRIPE_SECRET_KEY !== 'sk_test_account_payment_fixture' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54333') {
  throw new Error('Refusing payment fixture outside its isolated test process');
}
const https = require('node:https');
const http = require('node:http');
const original = https.request;
https.request = function(options, callback) {
  if (options && typeof options === 'object' && options.host === 'api.stripe.com') {
    if (options.headers?.Authorization !== 'Bearer sk_test_account_payment_fixture' &&
        options.headers?.authorization !== 'Bearer sk_test_account_payment_fixture') {
      throw new Error('Payment fixture refuses non-fixture credentials');
    }
    return http.request({ ...options, host: '127.0.0.1', hostname: '127.0.0.1', port: 54334, protocol: 'http:' }, callback);
  }
  return original.apply(this, arguments);
};
