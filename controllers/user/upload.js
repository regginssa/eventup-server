const { uploadToS3 } = require("../../services/s3");

const upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;

    const key = `uploads/${Date.now()}-${file.originalname}`;

    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // ACL: "public-read",
    };

    const fileUrl = await uploadToS3(params);

    res.status(200).json({ ok: true, data: fileUrl });
  } catch (error) {
    console.error("upload error: ", error);
    res.status(500).json({ ok: false, message: "Upload failed" });
  }
};

module.exports = { upload };
