export default (): unknown => ({
  node_env: process.env.NODE_ENV || "local",
  port: parseInt(process.env.PORT) || 3000,
  logger: {
    log_level: process.env.LOG_LEVEL || "debug",
  },
  disable_request_logger: process.env.DISABLE_REQUEST_LOGGER === "true",
  replicate: {
    apiKey: process.env.REPLICATE_API_TOKEN,
  },
  oauth2: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
  },
  jwt_secret: process.env.JWT_SECRET,
  frontend_url: process.env.FRONTEND_URL,
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    s3BucketName: process.env.AWS_S3_BUCKET_NAME,
  },
});
