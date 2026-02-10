const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = require("../s3Client");

const uploadToS3 = async (params) => {
  try {
    await s3Client.send(new PutObjectCommand(params));

    // Construct the permanent URL
    const fileUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return fileUrl;
  } catch (error) {
    console.error("[upload to s3 error]: ", error);
    return null;
  }
};

module.exports = { uploadToS3 };
