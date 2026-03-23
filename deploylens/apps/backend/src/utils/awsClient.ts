import { CodeDeployClient } from "@aws-sdk/client-codedeploy";
import { STSClient } from "@aws-sdk/client-sts";
import { decrypt } from "./encryption";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

export async function getCodeDeployClient(userId: string): Promise<CodeDeployClient> {
  const connection = await prisma.awsConnection.findUnique({
    where: { user_id: userId },
    select: {
      access_key_id_enc: true,
      secret_key_enc: true,
      region: true,
    },
  });

  if (!connection) {
    throw new Error("AWS_NOT_CONNECTED");
  }

  try {
    return new CodeDeployClient({
      region: connection.region,
      credentials: {
        accessKeyId: decrypt(connection.access_key_id_enc),
        secretAccessKey: decrypt(connection.secret_key_enc),
      },
    });
  } catch {
    throw new Error("AWS_CREDENTIALS_CORRUPT");
  }
}

export async function getSTSClient(
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
): Promise<STSClient> {
  return new STSClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}
