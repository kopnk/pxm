import {
  CfnOutput,
  Duration,
  Fn,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import {
  AttributeType,
  BillingMode,
  ProjectionType,
  Table,
} from "aws-cdk-lib/aws-dynamodb";
import {
  AccountRecovery,
  Mfa,
  CfnUserPoolGroup,
  UserPool,
  UserPoolClient,
  UserPoolEmail,
  VerificationEmailStyle,
} from "aws-cdk-lib/aws-cognito";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
  ObjectOwnership,
} from "aws-cdk-lib/aws-s3";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  OriginRequestPolicy,
  PriceClass,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { HttpOrigin, S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import {
  AuthorizationType,
  Cors,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { Code, Function as LambdaFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { EmailIdentity, Identity } from "aws-cdk-lib/aws-ses";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PxmStageConfig, PxmStageName } from "../config/stages";

export type PxmStackProps = StackProps & {
  config: PxmStageConfig;
};

const APP_NAME = "pxm";
const STACK_FILE_DIR = fileURLToPath(new URL(".", import.meta.url));

export class PxmStack extends Stack {
  constructor(scope: Construct, id: string, props: PxmStackProps) {
    super(scope, id, props);

    const { config } = props;
    const resourcePrefix = `${APP_NAME}-${config.stage}`;

    const dataTable = new Table(this, "SingleTable", {
      tableName: resourcePrefix,
      partitionKey: { name: "pk", type: AttributeType.STRING },
      sortKey: { name: "sk", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: config.pointInTimeRecovery,
      },
      removalPolicy: config.removalPolicy,
      deletionProtection: config.deletionProtection,
    });

    dataTable.addGlobalSecondaryIndex({
      indexName: "gsi1",
      partitionKey: { name: "gsi1pk", type: AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    dataTable.addGlobalSecondaryIndex({
      indexName: "gsi2",
      partitionKey: { name: "gsi2pk", type: AttributeType.STRING },
      sortKey: { name: "gsi2sk", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    const userPool = new UserPool(this, "UserPool", {
      userPoolName: `${resourcePrefix}-users`,
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      mfa: Mfa.OFF,
      email: UserPoolEmail.withCognito(),
      standardAttributes: {
        email: { required: true, mutable: false },
        givenName: { required: false, mutable: true },
        familyName: { required: false, mutable: true },
      },
      userVerification: {
        emailSubject: `PXM ${config.stage} verification code`,
        emailBody: "Your PXM verification code is {####}",
        emailStyle: VerificationEmailStyle.CODE,
      },
      removalPolicy: config.removalPolicy,
      deletionProtection: config.deletionProtection,
    });

    const userPoolClient = new UserPoolClient(this, "UserPoolClient", {
      userPoolClientName: `${resourcePrefix}-web`,
      userPool,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
      disableOAuth: true,
      accessTokenValidity: Duration.hours(3),
      idTokenValidity: Duration.hours(3),
      refreshTokenValidity: Duration.days(config.userRefreshTokenDays),
      preventUserExistenceErrors: true,
    });

    for (const groupName of ["superadmin", "admin", "staff"]) {
      new CfnUserPoolGroup(this, `${groupName}Group`, {
        userPoolId: userPool.userPoolId,
        groupName,
        description: `PXM ${groupName} role for ${config.stage}`,
      });
    }

    const appFilesBucket = new Bucket(this, "AppFilesBucket", {
      bucketName: `${resourcePrefix}-files-${this.account}-${this.region}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      versioned: config.appFilesVersioned,
      removalPolicy: config.removalPolicy,
      autoDeleteObjects: config.removalPolicy === RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [
            HttpMethods.GET,
            HttpMethods.PUT,
            HttpMethods.POST,
            HttpMethods.HEAD,
          ],
          allowedOrigins: config.allowedOrigins,
          allowedHeaders: ["authorization", "content-type"],
          exposedHeaders: ["ETag"],
          maxAge: 300,
        },
      ],
    });

    const priceClass =
      config.cloudFrontPriceClass === "PRICE_CLASS_200"
        ? PriceClass.PRICE_CLASS_200
        : PriceClass.PRICE_CLASS_100;

    const filesDistribution = new Distribution(this, "FilesDistribution", {
      comment: `${resourcePrefix} app files distribution`,
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(appFilesBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      priceClass,
    });

    // The pre-deploy migration copies the existing Secrets Manager value into
    // this SecureString name before CloudFormation removes the legacy resource.
    const partnerPoPdfSecretParameterName =
      `/${APP_NAME}/${config.stage}/partner-po-pdf-secret`;
    const partnerPoPdfSecret = StringParameter.fromSecureStringParameterAttributes(
      this,
      "PartnerPoPdfSecret",
      {
        parameterName: partnerPoPdfSecretParameterName,
      },
    );

    const authCookieSecret = new Secret(this, "AuthCookieSecret", {
      description: `HMAC secret for ${resourcePrefix} authentication cookies`,
      generateSecretString: {
        passwordLength: 64,
        excludePunctuation: true,
      },
      removalPolicy: config.removalPolicy,
    });

    const emailIdentity = config.sesIdentityEmail
      ? new EmailIdentity(this, "SesEmailIdentity", {
          identity: Identity.email(config.sesIdentityEmail),
        })
      : null;

    const apiHandler = new LambdaFunction(this, "ApiHandler", {
      functionName: `${resourcePrefix}-api`,
      code: Code.fromAsset(
        join(STACK_FILE_DIR, "../../frontend/.output-lambda/server"),
      ),
      handler: "index.handler",
      runtime: Runtime.NODEJS_22_X,
      memorySize: config.lambdaMemorySizeMb,
      timeout: Duration.seconds(config.lambdaTimeoutSeconds),
      environment: {
        PXM_STAGE: config.stage,
        TABLE_NAME: dataTable.tableName,
        AWS_DYNAMODB_TABLE: dataTable.tableName,
        AWS_COGNITO_USER_POOL_ID: userPool.userPoolId,
        AWS_COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        AWS_AUTH_COOKIE_SECRET: authCookieSecret.secretValue.unsafeUnwrap(),
        PARTNER_PO_PDF_SECRET_PARAM: partnerPoPdfSecretParameterName,
        PXM_PUBLIC_APP_URL: config.publicAppUrl ?? "",
        SESSION_COOKIE_SECURE: config.frontendHostingEnabled ? "true" : "false",
        AWS_APP_FILES_BUCKET: appFilesBucket.bucketName,
        AWS_APP_FILES_CLOUDFRONT_DOMAIN: `https://${filesDistribution.distributionDomainName}`,
        APP_FILES_BUCKET: appFilesBucket.bucketName,
        APP_FILES_CLOUDFRONT_DOMAIN: `https://${filesDistribution.distributionDomainName}`,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        SES_FROM_EMAIL: config.sesIdentityEmail ?? "",
      },
    });

    dataTable.grantReadWriteData(apiHandler);
    appFilesBucket.grantReadWrite(apiHandler);
    partnerPoPdfSecret.grantRead(apiHandler);
    apiHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminListGroupsForUser",
          "cognito-idp:AdminInitiateAuth",
          "cognito-idp:AdminRespondToAuthChallenge",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminUserGlobalSignOut",
          "cognito-idp:GetUser",
          "cognito-idp:ChangePassword",
        ],
        resources: [userPool.userPoolArn],
      }),
    );
    emailIdentity?.grantSendEmail(apiHandler);

    const api = new RestApi(this, "RestApi", {
      restApiName: `${resourcePrefix}-api`,
      description: `PXM ${config.stage} migration API`,
      // Browser document navigation usually sends `text/html` as the first
      // Accept value, even when the response is a PDF. API Gateway only checks
      // that first value when deciding whether to decode a base64 proxy
      // response, so `application/pdf` alone corrupts PDFs opened in-browser.
      // Nitro already sets `isBase64Encoded` only for binary responses.
      binaryMediaTypes: ["*/*"],
      deployOptions: {
        stageName: config.stage,
        throttlingBurstLimit: config.apiThrottleBurstLimit,
        throttlingRateLimit: config.apiThrottleRateLimit,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: config.allowedOrigins,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: [
          "authorization",
          "content-type",
          "x-requested-with",
          "x-csrf-token",
        ],
        allowCredentials: true,
      },
    });

    const lambdaIntegration = new LambdaIntegration(apiHandler, {
      proxy: true,
    });

    const apiRoot = api.root.addResource("api");
    apiRoot.addResource("health").addMethod("GET", lambdaIntegration, {
      authorizationType: AuthorizationType.NONE,
    });
    apiRoot.addResource("ready").addMethod("GET", lambdaIntegration, {
      authorizationType: AuthorizationType.NONE,
    });
    apiRoot.addResource("auth").addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
      defaultMethodOptions: {
        authorizationType: AuthorizationType.NONE,
      },
    });
    apiRoot.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
      defaultMethodOptions: {
        authorizationType: AuthorizationType.NONE,
      },
    });

    const webBucket = config.frontendHostingEnabled
      ? new Bucket(this, "WebBucket", {
          bucketName: config.frontendBucketName ?? `${resourcePrefix}-frontend`,
          blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
          encryption: BucketEncryption.S3_MANAGED,
          enforceSSL: true,
          removalPolicy: config.removalPolicy,
          autoDeleteObjects: config.removalPolicy === RemovalPolicy.DESTROY,
        })
      : null;

    const distribution = webBucket
      ? new Distribution(this, "WebDistribution", {
          comment: `${resourcePrefix} frontend distribution`,
          certificate: config.frontendCertificateArn
            ? Certificate.fromCertificateArn(
                this,
                "WebDistributionCertificate",
                config.frontendCertificateArn,
              )
            : undefined,
          domainNames: config.frontendDomainNames,
          defaultBehavior: {
            origin: S3BucketOrigin.withOriginAccessControl(webBucket),
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            cachePolicy: CachePolicy.CACHING_OPTIMIZED,
            responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
          },
          additionalBehaviors: {
            "/api/*": {
              origin: new HttpOrigin(
                Fn.select(2, Fn.split("/", api.urlForPath("/"))),
                {
                  originPath: `/${config.stage}`,
                },
              ),
              viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
              allowedMethods: AllowedMethods.ALLOW_ALL,
              cachePolicy: CachePolicy.CACHING_DISABLED,
              originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
              responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
            },
          },
          defaultRootObject: "index.html",
          errorResponses: [
            {
              httpStatus: 403,
              responseHttpStatus: 200,
              responsePagePath: "/index.html",
              ttl: Duration.minutes(5),
            },
            {
              httpStatus: 404,
              responseHttpStatus: 200,
              responsePagePath: "/index.html",
              ttl: Duration.minutes(5),
            },
          ],
          priceClass,
        })
      : null;

    this.addOutput("Stage", config.stage);
    this.addOutput("DynamoTableName", dataTable.tableName);
    this.addOutput("DynamoTableArn", dataTable.tableArn);
    this.addOutput("CognitoUserPoolId", userPool.userPoolId);
    this.addOutput("CognitoUserPoolClientId", userPoolClient.userPoolClientId);
    this.addOutput("AppFilesBucketName", appFilesBucket.bucketName);
    if (webBucket && distribution) {
      this.addOutput("WebBucketName", webBucket.bucketName);
      this.addOutput("CloudFrontDistributionId", distribution.distributionId);
      this.addOutput("CloudFrontDomainName", distribution.distributionDomainName);
      this.addOutput("CloudFrontUrl", `https://${distribution.distributionDomainName}`);
      if (config.frontendDomainNames?.length) {
        this.addOutput("FrontendDomainNames", config.frontendDomainNames.join(","));
      }
    }
    this.addOutput("FilesCloudFrontDistributionId", filesDistribution.distributionId);
    this.addOutput("FilesCloudFrontDomainName", filesDistribution.distributionDomainName);
    this.addOutput("FilesCloudFrontUrl", `https://${filesDistribution.distributionDomainName}`);
    this.addOutput("ApiUrl", api.url);
    this.addOutput("ApiHandlerName", apiHandler.functionName);
    this.addOutput(
      "PartnerPoPdfSecretParameterName",
      partnerPoPdfSecretParameterName,
    );
    if (emailIdentity) {
      this.addOutput("SesIdentityName", config.sesIdentityEmail ?? "");
    }
  }

  private addOutput(name: string, value: string) {
    new CfnOutput(this, name, { value });
  }
}

export function stackName(stage: PxmStageName) {
  return `PxmStack-${stage}`;
}
