import AWS from "aws-sdk";
import sharp from "sharp";

const s3 = new AWS.S3();

export const handler = async (event) => {
  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );

  if (!srcKey.match(/\.(jpg|jpeg|png)$/i)) {
    console.log(`Unsupported image type for key: ${srcKey}`);
    return;
  }

  const dstBucket = "s3.dev.pennyway.co.kr";
  const dstKey = `resized/${srcKey.split("/").pop()}`; // 원본 파일명 유지
  const imageSize = 81;

  try {
    const params = {
      Bucket: srcBucket,
      Key: srcKey,
    };
    const originImage = await s3.getObject(params).promise();

    const imageBuffer = originImage.Body;
    const contentType = originImage.ContentType;
    console.log(`Content-Type: ${contentType}`);
    console.log(`Image buffer length: ${imageBuffer.length}`);

    // Verify if the buffer contains valid image data
    if (!["image/jpeg", "image/png"].includes(contentType)) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    let imageMetadata;
    try {
      imageMetadata = await sharp(imageBuffer).metadata();
      console.log(`Image format: ${imageMetadata.format}`);
    } catch (metadataError) {
      console.error("Error reading image metadata:", metadataError);
      throw new Error("Unsupported image format or corrupted image file.");
    }

    const buffer = await sharp(imageBuffer).resize(imageSize).toBuffer();

    const dstParams = {
      Bucket: dstBucket,
      Key: dstKey,
      Body: buffer,
      ContentType: `image/${imageMetadata.format}`,
    };

    await s3.putObject(dstParams).promise();

    console.log(
      `Successfully resized ${srcBucket}/${srcKey} and uploaded to ${dstBucket}/${dstKey}`
    );
  } catch (error) {
    console.log("Error processing image:", error.message);
  }
};
