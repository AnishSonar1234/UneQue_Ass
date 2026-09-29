// This runs before any test file imports modules — sets env vars for all tests
process.env.VERIFY_TOKEN = "test_verify_token";
process.env.APP_SECRET = "test_app_secret";
process.env.PAGE_ACCESS_TOKEN = "test_page_token";
process.env.NODE_ENV = "test";
