const cloudinary = require("cloudinary").v2;
const { v4: uuidv4 } = require("uuid");
const path = require("path");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploadToCloudinary = async (file) => {
  try {
    console.log("uploading file: ", file);

    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${path.basename(
      file.originalname,
      ext
    )}_${uuidv4()}${ext}`;

    let resourceType = "raw";
    if (file.mimetype.startsWith("image/")) {
      resourceType = "image";
    } else if (file.mimetype.startsWith("video/")) {
      resourceType = "video";
    }

    const result = await cloudinary.uploader.upload(file.path, {
      public_id: uniqueName,
      use_filename: true,
      unique_filename: true,
      resource_type: resourceType,
    });

    return result.secure_url;
  } catch (error) {
    console.error("upload to cloudinary error: ", error);
    return null;
  }
};
module.exports = { uploadToCloudinary };
