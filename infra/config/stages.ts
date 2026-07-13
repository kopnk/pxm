import type { Environment, RemovalPolicy } from "aws-cdk-lib";
import { RemovalPolicy as CdkRemovalPolicy } from "aws-cdk-lib";

export type PxmStageName = "dev" | "prod";

export type PxmStageConfig = {
  stage: PxmStageName;
  env?: Environment;
  removalPolicy: RemovalPolicy;
  deletionProtection: boolean;
  pointInTimeRecovery: boolean;
  appFilesVersioned: boolean;
  frontendHostingEnabled: boolean;
  frontendBucketName?: string;
  frontendDomainNames?: string[];
  frontendCertificateArn?: string;
  cloudFrontPriceClass: "PRICE_CLASS_100" | "PRICE_CLASS_200";
  userRefreshTokenDays: number;
  lambdaMemorySizeMb: number;
  lambdaTimeoutSeconds: number;
  apiThrottleBurstLimit: number;
  apiThrottleRateLimit: number;
  sesIdentityEmail?: string;
};

const STAGES: Record<PxmStageName, Omit<PxmStageConfig, "env">> = {
  dev: {
    stage: "dev",
    removalPolicy: CdkRemovalPolicy.DESTROY,
    deletionProtection: false,
    pointInTimeRecovery: false,
    frontendHostingEnabled: false,
    cloudFrontPriceClass: "PRICE_CLASS_100",
    appFilesVersioned: false,
    userRefreshTokenDays: 7,
    lambdaMemorySizeMb: 256,
    lambdaTimeoutSeconds: 20,
    apiThrottleBurstLimit: 50,
    apiThrottleRateLimit: 100,
  },
  prod: {
    stage: "prod",
    removalPolicy: CdkRemovalPolicy.RETAIN,
    deletionProtection: true,
    pointInTimeRecovery: true,
    frontendHostingEnabled: true,
    frontendBucketName: "pxm-frontend",
    frontendDomainNames: ["www.proxem.site"],
    frontendCertificateArn:
      "arn:aws:acm:us-east-1:905418212759:certificate/fa0dea8d-33de-4ee3-84e4-36a5310b446f",
    cloudFrontPriceClass: "PRICE_CLASS_200",
    appFilesVersioned: true,
    userRefreshTokenDays: 30,
    lambdaMemorySizeMb: 512,
    lambdaTimeoutSeconds: 30,
    apiThrottleBurstLimit: 500,
    apiThrottleRateLimit: 1000,
  },
};

export function resolveStageName(value?: string): PxmStageName {
  if (value === "dev" || value === "prod") return value;
  throw new Error(`Invalid stage "${value ?? ""}". Use "dev" or "prod".`);
}

export function resolveStageConfig(params: {
  stage?: string;
  account?: string;
  region?: string;
  sesIdentityEmail?: string;
}): PxmStageConfig {
  const stage = resolveStageName(params.stage ?? "dev");
  const base = STAGES[stage];

  return {
    ...base,
    env: {
      account: params.account ?? process.env.CDK_DEFAULT_ACCOUNT,
      region: params.region ?? process.env.CDK_DEFAULT_REGION ?? "ap-southeast-1",
    },
    sesIdentityEmail: params.sesIdentityEmail,
  };
}
