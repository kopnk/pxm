import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const DEFAULT_AWS_REGION = "ap-southeast-1";
const MANAGED_STORAGE_SCHEME = "s3://";

let s3Client: S3Client | null = null;

function requireEnv(name: string, value?: string) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${name} is missing or empty.`);
  }

  return normalized;
}

function normalizeBaseUrl(value?: string) {
  const normalized = value?.trim();
  if (!normalized) return "";
  return normalized.replace(/\/+$/, "");
}

function encodeObjectKey(key: string) {
  return key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function decodeObjectKey(key: string) {
  return key
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

export function getAwsRegion() {
  return (
    process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    DEFAULT_AWS_REGION
  );
}

export function getAppFilesBucketName() {
  return requireEnv(
    "AWS_APP_FILES_BUCKET",
    process.env.AWS_APP_FILES_BUCKET || process.env.APP_FILES_BUCKET,
  );
}

function readAppFilesBucketName() {
  return (
    process.env.AWS_APP_FILES_BUCKET?.trim() ||
    process.env.APP_FILES_BUCKET?.trim() ||
    ""
  );
}

export function getAppFilesCloudFrontBaseUrl() {
  return normalizeBaseUrl(
    process.env.AWS_APP_FILES_CLOUDFRONT_DOMAIN ||
      process.env.APP_FILES_CLOUDFRONT_DOMAIN,
  );
}

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: getAwsRegion(),
    });
  }

  return s3Client;
}

export function toManagedFileUrl(key: string) {
  return `${MANAGED_STORAGE_SCHEME}${getAppFilesBucketName()}/${key.replace(/^\/+/, "")}`;
}

export function toAppFileUrl(key: string) {
  const normalizedKey = key.replace(/^\/+/, "");
  const cloudFrontBaseUrl = getAppFilesCloudFrontBaseUrl();

  if (!cloudFrontBaseUrl) {
    return toManagedFileUrl(normalizedKey);
  }

  return `${cloudFrontBaseUrl}/${encodeObjectKey(normalizedKey)}`;
}

export function fileKeyFromManagedUrl(fileUrl: string) {
  const bucketName = readAppFilesBucketName();
  if (!bucketName) return null;

  const managedPrefix = `${MANAGED_STORAGE_SCHEME}${bucketName}/`;

  if (fileUrl.startsWith(managedPrefix)) {
    return fileUrl.slice(managedPrefix.length);
  }

  const cloudFrontBaseUrl = getAppFilesCloudFrontBaseUrl();
  if (cloudFrontBaseUrl && fileUrl.startsWith(`${cloudFrontBaseUrl}/`)) {
    return decodeObjectKey(fileUrl.slice(cloudFrontBaseUrl.length + 1));
  }

  return null;
}

export async function uploadAppFileObject(params: {
  key: string;
  body: Buffer;
  contentType?: string | null;
  cacheControl?: string;
}) {
  const key = params.key.replace(/^\/+/, "");

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getAppFilesBucketName(),
      Key: key,
      Body: params.body,
      ContentType: params.contentType ?? undefined,
      CacheControl: params.cacheControl,
    }),
  );

  return {
    key,
    fileUrl: toManagedFileUrl(key),
    publicUrl: toAppFileUrl(key),
  };
}

export async function deleteAppFileObject(key: string) {
  const normalizedKey = key.replace(/^\/+/, "");

  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getAppFilesBucketName(),
      Key: normalizedKey,
    }),
  );
}
