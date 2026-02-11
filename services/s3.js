const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = require("../config/s3Client");

const uploadToS3 = async (params) => {
  try {
    console.log("[upload to s3 params]: ", params);

    await s3Client.send(new PutObjectCommand(params));

    // Construct the permanent URL
    const fileUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
    return fileUrl;
  } catch (error) {
    console.error("[upload to s3 error]: ", error);
    return null;
  }
};

module.exports = { uploadToS3 };
