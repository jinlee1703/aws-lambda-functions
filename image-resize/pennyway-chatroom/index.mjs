const AWS = require("aws-sdk");
const sharp = require("sharp");

// S3 클라이언트 생성
const s3 = new AWS.S3();

// Lambda 핸들러 함수 - Lambda 함수가 실행될 때 호출되는 함수
exports.handler = async (event) => {
  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );

  // 경로 패턴 정의
  const patterns = [
    // 채팅방 대표 이미지
    {
      name: "chatroom_representative",
      regex: /^chatroom\/([^\/]+)\/origin\/([^_]+)_([^\.]+)\.([^\.]+)$/,
      resizePath: (matches, size, ext) =>
        `chatroom/${matches[1]}/${size}/${matches[2]}_${matches[3]}.${ext}`,
    },
    // 채팅방 채팅 이미지
    {
      name: "chat",
      regex:
        /^chatroom\/([^\/]+)\/chat\/([^\/]+)\/origin\/([^_]+)_([^\.]+)\.([^\.]+)$/,
      resizePath: (matches, size, ext) =>
        `chatroom/${matches[1]}/chat/${matches[2]}/${size}/${matches[3]}_${matches[4]}.${ext}`,
    },
    // 채팅방 사용자 프로필 이미지
    {
      name: "chatroom_user_profile",
      regex:
        /^chatroom\/([^\/]+)\/chat_profile\/([^\/]+)\/origin\/([^_]+)_([^\.]+)\.([^\.]+)$/,
      resizePath: (matches, size, ext) =>
        `chatroom/${matches[1]}/chat_profile/${matches[2]}/${size}/${matches[3]}_${matches[4]}.${ext}`,
    },
  ];

  // 패턴 매칭 및 처리
  for (let pattern of patterns) {
    const matches = srcKey.match(pattern.regex);
    if (matches) {
      await processImage(
        srcBucket,
        srcKey,
        matches,
        pattern.resizePath,
        matches[matches.length - 1]
      );
      return;
    }
  }

  console.log("No matching pattern found for key:", srcKey);
};

const processImage = async (srcBucket, srcKey, matches, resizePath, ext) => {
  const imageType = ext.toLowerCase();
  if (imageType !== "jpg" && imageType !== "png" && imageType !== "jpeg") {
    console.log(`Unsupported image type: ${imageType}`);
    return;
  }

  const imageSize = 81; // 리사이징 크기
  const dstBucket = srcBucket;
  const dstKey = resizePath(matches, imageSize, ext);

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
      ContentType: `image/${imageType}`,
    };

    await s3.putObject(dstParams).promise();

    console.log(
      `Successfully resized ${srcBucket}/${srcKey} and uploaded to ${dstBucket}/${dstKey}`
    );
  } catch (error) {
    console.log("Error processing image:", error);
  }
};
