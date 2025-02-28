const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3")

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
})

const uploadVideoToS3 = async (file) => {
  if (!file) throw new Error("No file provided!");

  const videoKey = `videos/${Date.now()}_${file.originalname}`;

  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: videoKey,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read",
  };

  await s3.send(new PutObjectCommand(uploadParams));

  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${videoKey}`;
};

const deleteVideoFromS3 = async (videoKey) => {
    try {
        const deleteParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: videoKey,
        }

        await s3.send(new DeleteObjectCommand(deleteParams));
        console.log(`Deleted video: ${videoKey}`);
    } catch (error) {
        console.error("Error deleting video:", error);
    }
}

module.exports = { 
    uploadVideoToS3,
    deleteVideoFromS3
};
