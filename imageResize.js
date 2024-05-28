// AWS SDK 및 모듈 로드
const AWS = require("aws-sdk");
const util = require("util");
const sharp = require("sharp");

// S3 클라이언트 생성
const s3 = new AWS.S3();

// Lambda 핸들러 함수 - Lambda 함수가 실행될 때 호출되는 함수
exports.handler = async (event, context, callback) => {
  // 이벤트에서 옵션 읽기 - Lambda가 트리거될 때 전달되는 event 객체에서 S3 버킷 이름과 객체 키를 추출
  console.log(
    "Reading options from event:\n",
    util.inspect(event, { depth: 5 })
  );
  const srcBucket = event.Records[0].s3.bucket.name;

  // 대상 버킷과 파일 이름 설정
  const srcKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );
  const dstBucket = "s3.dev.pennyway.co.kr";
  const dstKey = "profile/<userId>/<image_size>/<uuid>_<timestamp>.{ext}"; // 리사이징 된 이미지가 저장될 파일 이름

  // 이미지 타입 추론 및 검증
  const typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    console.log("Could not determine the image type.");
    return;
  }

  // 이미지 타입 추론 및 검증
  const imageType = typeMatch[1].toLowerCase();
  if (imageType != "jpg" && imageType != "png" && imageType != "jpeg") {
    console.log(`Unsupported image type: ${imageType}`);
    return;
  }

  // 이미지 가져오기
  try {
    const params = {
      Bucket: srcBucket,
      Key: srcKey,
    };
    var orignImage = await s3.getObject(params).promise();
  } catch (error) {
    console.log(error);
    return;
  }

  // 이미지 리사이징
  const width = 81;
  try {
    var buffer = await sharp(origimage.Body).resize(width).toBuffer();
  } catch (error) {
    console.log(error);
    return;
  }

  // 리사이징된 이미지 업로드
  try {
    const destparams = {
      Bucket: dstBucket,
      Key: dstKey,
      Body: buffer,
      ContentType: "image",
    };

    const putResult = await s3.putObject(destparams).promise();
  } catch (error) {
    console.log(error);
    return;
  }

  // 성공 메시지 출력
  console.log(
    "Successfully resized " +
      srcBucket +
      "/" +
      srcKey +
      " and uploaded to " +
      dstBucket +
      "/" +
      dstKey
  );
};
