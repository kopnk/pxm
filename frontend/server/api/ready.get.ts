import { defineEventHandler, createError } from "h3";
import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { successResponse } from "~/server/utils/response";
import { getAwsRegion } from "~/server/utils/appFilesStorage";

export default defineEventHandler(async (event) => {
  const tableName =
    process.env.AWS_DYNAMODB_TABLE?.trim() ||
    process.env.TABLE_NAME?.trim() ||
    "";

  if (!tableName) {
    throw createError({
      statusCode: 503,
      statusMessage: "DynamoDB table is not configured",
    });
  }

  try {
    const client = new DynamoDBClient({
      region: getAwsRegion(),
    });

    await client.send(
      new DescribeTableCommand({
        TableName: tableName,
      }),
    );
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: "DynamoDB table is not ready",
    });
  }

  return successResponse(event, "Service is ready", {
    status: "ready",
    dynamodb: "ok",
  });
});
