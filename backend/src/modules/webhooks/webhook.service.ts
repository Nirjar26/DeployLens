import crypto from "crypto";
import { emitDeploymentUpdate } from "../../utils/emitDeploymentUpdate";
import { calculateUnifiedStatus } from "../../utils/unifiedStatus";
import { upsertWorkflowRunFromWebhook } from "../github/github.service";
import { getAndStoreDeploymentEvents } from "../aws/aws.service";
import { runAggregator } from "../aggregator/aggregator.service";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const snsCertCache = new Map<string, string>();

async function verifyGithubWebhook(rawBody: Buffer, signature: string, repoFullName: string): Promise<boolean> {
  const repo = await prisma.repository.findFirst({
    where: {
      full_name: repoFullName,
      is_active: true,
    },
    select: {
      webhook_secret: true,
    },
  });

  if (!repo || !repo.webhook_secret) {
    return false;
  }

  const hmac = crypto.createHmac("sha256", repo.webhook_secret);
  hmac.update(rawBody);
  const expected = `sha256=${hmac.digest("hex")}`;

  if (expected.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function mapWebhookStatus(status: string, conclusion: string | null): string {
  if (!conclusion) {
    return status;
  }

  if (conclusion === "success") return "success";
  if (conclusion === "failure") return "failure";
  if (conclusion === "cancelled") return "cancelled";
  return status;
}

function buildSnsStringToSign(message: any): string {
  const orderedFields: Array<"Message" | "MessageId" | "Subject" | "Timestamp" | "TopicArn" | "Type"> = [
    "Message",
    "MessageId",
    "Subject",
    "Timestamp",
    "TopicArn",
    "Type",
  ];

  let output = "";
  for (const field of orderedFields) {
    if (message[field] === undefined || message[field] === null) continue;
    output += `${field}\n${message[field]}\n`;
  }

  return output;
}

function parseTrustedSnsUrl(urlString: string, purpose: "certificate" | "subscription"): URL | null {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "https:") {
      return null;
    }

    if (url.username || url.password || url.port || url.hash) {
      return null;
    }

    if (!/^sns\.[a-z0-9-]+\.amazonaws\.com$/i.test(url.hostname)) {
      return null;
    }

    if (purpose === "certificate") {
      const hasPemPath = /\.pem$/i.test(url.pathname);
      if (!hasPemPath || url.search) {
        return null;
      }
    }

    if (purpose === "subscription") {
      const action = url.searchParams.get("Action");
      if (url.pathname !== "/" || action !== "ConfirmSubscription") {
        return null;
      }
    }

    return url;
  } catch {
    return null;
  }
}

async function fetchSnsCertificate(signingCertUrl: string): Promise<string> {
  const cached = snsCertCache.get(signingCertUrl);
  if (cached) return cached;

  const trustedCertUrl = parseTrustedSnsUrl(signingCertUrl, "certificate");
  if (!trustedCertUrl) {
    throw new Error("INVALID_CERT_URL");
  }

  const response = await fetch(trustedCertUrl.href, {
    method: "GET",
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error("CERT_FETCH_FAILED");
  }

  const certPem = await response.text();
  snsCertCache.set(signingCertUrl, certPem);
  return certPem;
}

async function verifySnsSignature(body: any): Promise<boolean> {
  const signingCertUrl = body.SigningCertURL as string | undefined;
  const signature = body.Signature as string | undefined;

  if (!signingCertUrl || !signature) {
    return false;
  }

  try {
    const cert = await fetchSnsCertificate(signingCertUrl);
    const stringToSign = buildSnsStringToSign(body);
    const verify = crypto.createVerify("SHA1");
    verify.update(stringToSign);
    return verify.verify(cert, signature, "base64");
  } catch {
    return false;
  }
}

function mapSnsCodeDeployStatus(status: string): string | null {
  if (status === "SUCCEEDED") return "Succeeded";
  if (status === "FAILED") return "Failed";
  if (status === "STOPPED") return "Stopped";
  if (status === "IN_PROGRESS") return "InProgress";
  if (status === "CREATED") return "Created";
  return null;
}

async function processSnsNotificationMessage(message: any) {
  const deploymentId = message.deploymentId as string | undefined;
  const applicationName = message.applicationName as string | undefined;
  const deploymentGroupName = message.deploymentGroupName as string | undefined;
  const rawStatus = message.status as string | undefined;

  if (!deploymentId || !applicationName || !deploymentGroupName || !rawStatus) {
    return;
  }

  const codedeployStatus = mapSnsCodeDeployStatus(rawStatus);
  if (!codedeployStatus) {
    return;
  }

  let deployment = await prisma.deployment.findFirst({
    where: { codedeploy_id: deploymentId },
    select: {
      id: true,
      user_id: true,
      github_status: true,
      is_rollback: true,
    },
  });
  let isNewDeployment = false;

  if (!deployment) {
    const environment = await prisma.environment.findFirst({
      where: {
        codedeploy_app: applicationName,
        codedeploy_group: deploymentGroupName,
      },
      select: {
        id: true,
        user_id: true,
        repository_id: true,
      },
    });

    if (!environment) {
      return;
    }

    deployment = await prisma.deployment.create({
      data: {
        user_id: environment.user_id,
        repository_id: environment.repository_id,
        environment_id: environment.id,
        commit_sha: "unknown",
        branch: "unknown",
        codedeploy_id: deploymentId,
        codedeploy_status: codedeployStatus,
        unified_status: calculateUnifiedStatus(null, codedeployStatus, false),
      },
      select: {
        id: true,
        user_id: true,
        github_status: true,
        is_rollback: true,
      },
    });
    isNewDeployment = true;
  }

  const updated = await prisma.deployment.update({
    where: { id: deployment.id },
    data: {
      codedeploy_status: codedeployStatus,
      unified_status: calculateUnifiedStatus(
        deployment.github_status ?? null,
        codedeployStatus,
        deployment.is_rollback,
      ),
      finished_at: codedeployStatus === "Succeeded" || codedeployStatus === "Failed" || codedeployStatus === "Stopped"
        ? new Date()
        : null,
    },
    select: {
      id: true,
      user_id: true,
      codedeploy_id: true,
    },
  });

  if ((codedeployStatus === "Succeeded" || codedeployStatus === "Failed") && updated.codedeploy_id) {
    await getAndStoreDeploymentEvents(updated.user_id, updated.codedeploy_id);
  }

  void emitDeploymentUpdate(updated.id, isNewDeployment).catch((err) => {
    console.error("Failed to emit deployment socket update after AWS webhook:", err);
  });
  runAggregator(updated.user_id).catch((err) => {
    console.error("Aggregator failed after AWS webhook:", err);
  });
}

export async function processGithubWebhook(rawBody: Buffer, signatureHeader: string | undefined, event: string | undefined) {
  let payload: any;

  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return { statusCode: 400, body: { message: "invalid JSON payload" } };
  }

  const repoFullName = payload?.repository?.full_name;

  if (!repoFullName) {
    return { statusCode: 400, body: { message: "missing repository in payload" } };
  }

  if (!signatureHeader) {
    return { statusCode: 401, body: { message: "missing signature" } };
  }

  const verified = await verifyGithubWebhook(rawBody, signatureHeader, repoFullName);
  if (!verified) {
    console.warn(`webhook signature failed for repo: ${repoFullName}`);
    return { statusCode: 401, body: { message: "invalid signature" } };
  }

  if (event !== "workflow_run") {
    return { statusCode: 200, body: { message: "ignored" } };
  }

  const workflowRun = payload.workflow_run;

  if (!workflowRun) {
    return { statusCode: 200, body: { message: "ignored" } };
  }

  const githubStatus = mapWebhookStatus(workflowRun.status, workflowRun.conclusion ?? null);
  const startedAt = workflowRun.run_started_at ?? workflowRun.created_at;
  const finishedAt = githubStatus === "success" || githubStatus === "failure" || githubStatus === "cancelled"
    ? workflowRun.updated_at
    : null;
  const durationSeconds = finishedAt
    ? Math.max(0, Math.floor((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000))
    : null;

  const isNewDeployment = !(await prisma.deployment.findUnique({
    where: { github_run_id: String(workflowRun.id) },
    select: { id: true },
  }));

  const deployment = await upsertWorkflowRunFromWebhook({
    repoFullName: payload.repository?.full_name,
    githubRunId: String(workflowRun.id),
    commitSha: workflowRun.head_sha,
    branch: workflowRun.head_branch,
    commitMessage: workflowRun.head_commit?.message ?? "",
    triggeredBy: workflowRun.actor?.login ?? "unknown",
    githubStatus,
    githubRunUrl: workflowRun.html_url,
    startedAt,
    finishedAt,
    durationSeconds,
  });

  if (!deployment) {
    return { statusCode: 200, body: { message: "repo not tracked" } };
  }

  void emitDeploymentUpdate(deployment.id, isNewDeployment).catch((err) => {
    console.error("Failed to emit deployment socket update after GitHub webhook:", err);
  });
  const deploymentOwner = await prisma.deployment.findUnique({
    where: { id: deployment.id },
    select: { user_id: true },
  });

  if (deploymentOwner?.user_id) {
    runAggregator(deploymentOwner.user_id).catch((err) => {
      console.error("Aggregator failed after GitHub webhook:", err);
    });
  }

  return { statusCode: 200, body: { message: "ok" } };
}

export async function processAwsWebhook(rawBody: Buffer) {
  let body: any;

  try {
    body = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return { statusCode: 400, body: { error: "Invalid JSON" } };
  }

  if (body.Type === "SubscriptionConfirmation") {
    const subscribeUrl = body.SubscribeURL as string | undefined;
    const trustedSubscribeUrl = subscribeUrl ? parseTrustedSnsUrl(subscribeUrl, "subscription") : null;
    if (!trustedSubscribeUrl) {
      return { statusCode: 400, body: { error: "Invalid subscription URL" } };
    }

    try {
      await fetch(trustedSubscribeUrl.href, {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
      console.log(`SNS subscription confirmed for topic: ${body.TopicArn}`);
      return { statusCode: 200, body: { received: true } };
    } catch {
      return { statusCode: 400, body: { error: "Invalid subscription URL" } };
    }
  }

  if (body.Type === "Notification") {
    const validSignature = await verifySnsSignature(body);
    if (!validSignature) {
      return { statusCode: 401, body: { error: "Invalid signature" } };
    }

    let message: any;
    try {
      message = JSON.parse(body.Message);
    } catch {
      return { statusCode: 400, body: { error: "Invalid message JSON" } };
    }

    await processSnsNotificationMessage(message);
    return { statusCode: 200, body: { received: true } };
  }

  return { statusCode: 200, body: { received: true } };
}
