import { listAgents, normalizeAgentId } from "@/lib/server/agentRegistry";
import { issueQualificationTokenFromPersistentResult, qualificationProtocolVersion } from "@/lib/server/qualification";
import { verifyUserToken } from "@/lib/server/userRegistry";
import { isReservedVirtualAgentId } from "@/lib/server/virtualAgents";

export const runtime = "nodejs";

type HealthcheckIssue = {
  code: string;
  message: string;
  field?: string;
};

export async function POST(request: Request) {
  const input = await request.json().catch(() => ({}));
  const issues: HealthcheckIssue[] = [];
  const rawAgentId = stringValue(input.id ?? input.agentId ?? input.name);
  const modelName = stringValue(input.modelName);
  const ownerUserId = stringValue(input.ownerUserId);
  const userToken = stringValue(input.userToken);
  let qualificationToken = stringValue(input.qualificationToken);
  let agentId: string | undefined;

  try {
    agentId = normalizeAgentId(rawAgentId);
  } catch (error) {
    issues.push({
      code: "invalid_agent_id",
      field: "agentId",
      message: error instanceof Error ? error.message : "agentId is invalid.",
    });
  }

  const existingAgent = agentId ? listAgents().find((agent) => agent.id === agentId) : undefined;

  if (agentId && (isReservedVirtualAgentId(agentId) || existingAgent?.kind === "virtual")) {
    issues.push({
      code: "reserved_agent_id",
      field: "agentId",
      message: "This Agent id is reserved for a built-in virtual Agent.",
    });
  }

  if (!modelName && !existingAgent?.modelName) {
    issues.push({
      code: "missing_model_name",
      field: "modelName",
      message: "modelName is required. Use the host model name, for example OpenClaw-MiniMax.",
    });
  }

  let userVerified = false;
  let persistentQualification: {
    modelName: string;
    ownerUserId: string;
    passedAt: Date;
    protocolVersion: string;
  } | null = null;
  let issuedQualificationToken:
    | {
        expiresAt: string;
        token: string;
      }
    | undefined;
  if (existingAgent?.ownerUserId) {
    if (ownerUserId && ownerUserId !== existingAgent.ownerUserId) {
      issues.push({
        code: "owner_mismatch",
        field: "ownerUserId",
        message: "Cannot move an existing Agent to another owner.",
      });
    }

    if (!userToken) {
      issues.push({
        code: "missing_user_token",
        field: "userToken",
        message: "userToken is required to reuse this existing Agent.",
      });
    } else {
      userVerified = await verifyToken(existingAgent.ownerUserId, userToken, issues);
    }
  } else {
    if (!ownerUserId || !userToken) {
      issues.push({
        code: "missing_user_credentials",
        field: !ownerUserId ? "ownerUserId" : "userToken",
        message: "Provide saved ownerUserId/userToken, or create a club user first.",
      });
    } else {
      userVerified = await verifyToken(ownerUserId, userToken, issues);
    }
  }

  if (agentId && !existingAgent && userVerified && ownerUserId && modelName && !qualificationToken && issues.length === 0) {
    const issued = await issueQualificationTokenFromPersistentResult({ agentId, modelName, ownerUserId });
    if (issued) {
      qualificationToken = issued.qualificationToken.token;
      issuedQualificationToken = {
        token: issued.qualificationToken.token,
        expiresAt: issued.qualificationToken.expiresAt,
      };
      persistentQualification = {
        modelName: issued.qualification.modelName,
        ownerUserId: issued.qualification.ownerUserId,
        passedAt: issued.qualification.passedAt,
        protocolVersion: issued.qualification.protocolVersion,
      };
    }
  }

  const nextAction = nextActionFor({
    agentId,
    existingAgent,
    issues,
    qualificationToken,
    userVerified,
  });

  return Response.json({
    ok: issues.length === 0,
    nextAction,
    agentId,
    existingAgent: existingAgent
      ? {
          id: existingAgent.id,
          name: existingAgent.name,
          ownerUserId: existingAgent.ownerUserId,
          modelName: existingAgent.modelName,
          assignmentStatus: existingAgent.assignmentStatus,
          tableId: existingAgent.tableId,
        }
      : null,
    requiresQualification: nextAction === "run_qualification",
    qualificationRequiredReason:
      nextAction === "run_qualification"
        ? `No persisted qualification result exists for protocol ${qualificationProtocolVersion}, this agentId, ownerUserId, and modelName.`
        : null,
    persistentQualification: persistentQualification
      ? {
          ...persistentQualification,
          passedAt: persistentQualification.passedAt.toISOString(),
        }
      : null,
    issuedQualificationToken,
    resumeInstructions:
      nextAction === "register_agent" && issuedQualificationToken
        ? "Persisted qualification found. Do not run qualification again; register using issuedQualificationToken.token."
        : nextAction === "open_websocket" || nextAction === "already_connected"
          ? "Agent is already registered. Do not run qualification. Open the formal WebSocket only."
          : undefined,
    issues,
  });
}

async function verifyToken(ownerUserId: string, userToken: string, issues: HealthcheckIssue[]) {
  try {
    await verifyUserToken(ownerUserId, userToken);
    return true;
  } catch (error) {
    issues.push({
      code: "invalid_user_token",
      field: "userToken",
      message: error instanceof Error ? error.message : "userToken is invalid.",
    });
    return false;
  }
}

function nextActionFor(input: {
  agentId?: string;
  existingAgent?: ReturnType<typeof listAgents>[number];
  issues: HealthcheckIssue[];
  qualificationToken: string;
  userVerified: boolean;
}) {
  if (input.issues.some((issue) => issue.code === "invalid_agent_id" || issue.code === "reserved_agent_id")) {
    return "choose_agent_id";
  }

  if (input.issues.some((issue) => issue.code === "missing_user_credentials")) {
    return "create_user_or_provide_saved_credentials";
  }

  if (input.issues.some((issue) => issue.code === "invalid_user_token" || issue.code === "missing_user_token" || issue.code === "owner_mismatch")) {
    return "provide_valid_user_token";
  }

  if (!input.userVerified) {
    return "create_user_or_provide_saved_credentials";
  }

  if (input.issues.length > 0) {
    return "fix_issues";
  }

  if (input.existingAgent?.tableId) {
    return "already_connected";
  }

  if (input.existingAgent) {
    return "open_websocket";
  }

  if (!input.qualificationToken) {
    return "run_qualification";
  }

  return "register_agent";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
