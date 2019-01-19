module.exports = {
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_S3_BUCKET_REGION: process.env.AWS_S3_BUCKET_REGION,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    TINIFY_API_KEY: process.env.TINIFY_API_KEY,
    PORT: process.env.PORT || 3000,
    DB_URI: process.env.DB_URI,
    TZ: process.env.TZ || 0,
};
