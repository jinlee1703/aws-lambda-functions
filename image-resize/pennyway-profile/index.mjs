// AWS SDK 및 모듈 로드
import AWS from "aws-sdk";
import sharp from "sharp";

// S3 클라이언트 생성
const s3 = new AWS.S3();

// Lambda 핸들러 함수 - Lambda 함수가 실행될 때 호출되는 함수
exports.handler = async (event, context, callback) => {
  // 소스 버킷 및 파일 이름 설정
  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );

  // 파일 이름 검증
  const srcKeyPattern =
    /^profile\/([^\/]+)\/origin\/([^_]+)_([^\.]+)\.([^\.]+)$/;
  const match = srcKey.match(srcKeyPattern);
  if (!match) {
    console.log("Could not parse the source key.");
    return;
  }

  // 이미지 타입 추론 및 검증
  const typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    console.log("Could not determine the image type.");
    return;
  }

  const imageType = typeMatch[1].toLowerCase();
  if (imageType != "jpg" && imageType != "png" && imageType != "jpeg") {
    console.log(`Unsupported image type: ${imageType}`);
    return;
  }

  // 사용자 ID, 이미지 크기, UUID, 타임스탬프, 확장자 추출 및
  const userId = match[1];
  const uuid = match[2];
  const timestamp = match[3];
  const ext = match[4];

  const imageSize = 81;
  const dstBucket = "s3.dev.pennyway.co.kr"; // 리사이징된 이미지가 저장될 버켓 이름;
  const dstKey = `profile/${userId}/${imageSize}/${uuid}_${timestamp}.${ext}`; // 리사이징된 이미지가 저장될 파일 이름

  console.log(`srcKey: ${srcKey}`);
  console.log(`dstKey: ${dstKey}`);

  try {
    const params = {
      Bucket: srcBucket,
      Key: srcKey,
    };
    const originImage = await s3.getObject(params).promise();
    const buffer = await sharp(originImage.Body).resize(imageSize).toBuffer();

    const dstParams = {
      Bucket: dstBucket,
      Key: dstKey,
      Body: buffer,
      ContentType: "image",
    };

    const putResult = await s3.putObject(destparams).promise();

    console.log(
      `Successfully resized ${srcBucket} / ${srcKey} and uploaded to ${dstBucket} / ${dstKey}`
    );
  } catch (error) {
    console.log(error);
    return;
  }
};
