#!/usr/bin/env node
import { App, Tags } from "aws-cdk-lib";
import {
  stackName,
  PxmStack,
} from "../lib/pxm-stack";
import { resolveStageConfig } from "../config/stages";

const app = new App();

const config = resolveStageConfig({
  stage: app.node.tryGetContext("stage"),
  account: app.node.tryGetContext("account"),
  region: app.node.tryGetContext("region"),
  sesIdentityEmail: app.node.tryGetContext("sesIdentityEmail"),
});

const stack = new PxmStack(app, stackName(config.stage), {
  env: config.env,
  config,
  description: `PXM ${config.stage} AWS stack: DynamoDB, Cognito, SES, S3, and CloudFront.`,
});

Tags.of(stack).add("Application", "pxm");
Tags.of(stack).add("Stage", config.stage);
Tags.of(stack).add("ManagedBy", "aws-cdk");
