import { createServer, type IncomingMessage } from "node:http";
import next from "next";
import WebSocket, { WebSocketServer } from "ws";
import { listAgents, markAgentDisconnected, markAgentSeen, subscribeAgentRegistry } from "./src/lib/server/agentRegistry";
import {
  clearPendingDecisions,
  getPendingDecision,
  StaleDecisionRequestError,
  submitDecision,
  subscribePendingDecision,
  validateDecisionResponse,
} from "./src/lib/server/decisionBroker";
import { addRuntimeFeedback, getRuntimeInstructions } from "./src/lib/server/runtimeInstructions";
import { getTableManager } from "./src/lib/server/simulator";
import { logger } from "./src/lib/server/logger";
import { assertQualificationSession, createQualificationWsTask, markQualificationWsPassed } from "./src/lib/server/qualification";
import type { AgentDecisionResponse } from "./src/lib/poker/types";

const { hostname, port } = parseArgs(process.argv.slice(2));
const app = next({ dev: process.env.NODE_ENV !== "production", hostname, port });
const handle = app.getRequestHandler();
const wsPath = "/api/agents/ws";
const qualificationWsPath = "/api/agents/qualification/ws";
const disconnectedAgentLeaveGraceMs = 45_000;
const disconnectedAgentTimers = new Map<string, ReturnType<typeof setTimeout>>();
const activeAgentConnections = new Map<string, symbol>();

void main();

async function main() {
  await app.prepare();

  const server = createServer((request, response) => {
    void handle(request, response);
  });
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", originFor(request));

    if (url.pathname !== wsPath && url.pathname !== qualificationWsPath) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws, request) => {
    const url = new URL(request.url ?? "/", originFor(request));
    if (url.pathname === qualificationWsPath) {
      handleQualificationWs(ws, request, url);
      return;
    }

    const agentId = url.searchParams.get("agentId")?.trim();
    const origin = originFor(request);

    if (!agentId) {
      logger.warn("ws.connection_rejected", { reason: "missing_agent_id", remoteAddress: request.socket.remoteAddress });
      send(ws, { type: "agent_stop", shouldStop: true, reason: "agentId is required." });
      ws.close(1008, "agentId is required");
      return;
    }

    if (!listAgents().some((agent) => agent.id === agentId)) {
      logger.warn("ws.connection_rejected", { agentId, reason: "agent_not_registered", remoteAddress: request.socket.remoteAddress });
      send(ws, {
        type: "agent_stop",
        agentId,
        shouldStop: true,
        reason: "Agent is not registered. Register again before opening WebSocket.",
      });
      ws.close(1008, "Agent is not registered");
      return;
    }

    markAgentSeen(agentId);
    clearDisconnectedAgentTimer(agentId);
    const connectionId = Symbol(agentId);
    activeAgentConnections.set(agentId, connectionId);
    logger.info("ws.connected", { agentId, origin, remoteAddress: request.socket.remoteAddress });
    void getTableManager(origin).handleAgentOnline(agentId).then(() => {
      sendAssignmentState(ws, agentId, undefined, origin);
    });
    sendAgentState(ws, agentId, "ws_welcome", origin);
    sendAssignmentState(ws, agentId, "queue_status", origin);
    let lastAssignment = currentAssignment(agentId);

    const stopIfAgentRemoved = () => {
      if (listAgents().some((agent) => agent.id === agentId)) {
        return false;
      }

      send(ws, {
        type: "agent_stop",
        agentId,
        shouldStop: true,
        reason: "Agent is no longer registered. Stop this WebSocket worker.",
      });
      logger.info("ws.agent_removed_stop", { agentId });
      ws.close(1000, "Agent is no longer registered");
      return true;
    };
    const unsubscribeRegistry = subscribeAgentRegistry(stopIfAgentRemoved);
    const unsubscribeAssignment = subscribeAgentRegistry(() => {
      const nextAssignment = currentAssignment(agentId);
      if (assignmentKey(nextAssignment) !== assignmentKey(lastAssignment)) {
        if (lastAssignment?.tableId && nextAssignment?.assignmentStatus === "queued") {
          send(ws, {
            type: "table_settled",
            agentId,
            previousTableId: lastAssignment.tableId,
            previousTableUrl: tableUrlFor(origin, lastAssignment.tableId),
            shouldStop: false,
          });
          logger.info("table.settled_notice_sent", { agentId, previousTableId: lastAssignment.tableId });
        }
        lastAssignment = nextAssignment;
        logger.info("agent.assignment_changed", { agentId, assignment: nextAssignment });
        sendAssignmentState(ws, agentId, undefined, origin);
      }
    });
    const unsubscribe = subscribePendingDecision(agentId, (decision) => {
      if (decision) {
        sendAgentState(ws, agentId, "decision_task", origin);
      }
    });
    let awaitingPong = false;
    ws.on("pong", () => {
      awaitingPong = false;
      markAgentSeen(agentId);
    });
    const heartbeat = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        return;
      }

      if (stopIfAgentRemoved()) {
        return;
      }

      if (awaitingPong) {
        logger.warn("ws.pong_timeout", { agentId });
        ws.terminate();
        return;
      }

      awaitingPong = true;
      ws.ping();
      send(ws, { type: "heartbeat", agentId, shouldStop: false, at: new Date().toISOString() });
    }, 5_000);

    ws.on("message", (raw) => {
      markAgentSeen(agentId);
      void getTableManager(origin).handleAgentOnline(agentId);

      try {
        const payload = JSON.parse(raw.toString()) as (AgentDecisionResponse & { requestId?: string }) | AgentLeaveMessage;
        if (isAgentLeaveMessage(payload)) {
          if (payload.agentId && payload.agentId !== agentId) {
            throw new Error("agent_leave agentId does not match this WebSocket connection.");
          }

          logger.info("agent.leave_requested", { agentId });
          void getTableManager(origin)
            .leaveAgent(agentId)
            .then((result) => {
              logger.info("agent.leave_completed", { agentId, ...result });
              send(ws, {
                type: "agent_stop",
                agentId,
                ok: true,
                removed: result.removed,
                shouldStop: true,
                reason: "Agent requested to leave the game.",
              });
              ws.close(1000, "Agent requested to leave");
            })
            .catch((error: unknown) => {
              logger.error("agent.leave_failed", { agentId, error });
              send(ws, { type: "action_error", ok: false, error: error instanceof Error ? error.message : "Unable to leave game." });
            });
          return;
        }

        submitDecision(payload);
        logger.info("decision.response_acknowledged", {
          agentId,
          requestId: payload.requestId,
          tableId: payload.tableId,
          actionType: payload.action?.type,
          amount: actionAmount(payload.action),
        });
        send(ws, { type: "action_ack", requestId: payload.requestId, ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid WebSocket action response.";
        if (error instanceof StaleDecisionRequestError) {
          logger.warn("decision.response_stale", { agentId, error: message });
          send(ws, {
            type: "action_error",
            ok: false,
            code: error.code,
            recoverable: error.recoverable,
            error: message,
          });
          return;
        }

        logger.warn("decision.response_rejected", { agentId, error: message });
        try {
          addRuntimeFeedback(
            agentId,
            `上次 WebSocket 提交动作失败：${message}。请严格按动作格式输出：fold/check/call 只能是 {"type":"call"} 这类对象，不能带 amount；只有 bet/raise 可以带正数 amount。`,
          );
        } catch {
          // Keep the original protocol error visible even if feedback storage fails.
        }
        send(ws, { type: "action_error", ok: false, error: message });
      }
    });

    ws.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      unsubscribeRegistry();
      unsubscribeAssignment();
      if (activeAgentConnections.get(agentId) !== connectionId) {
        logger.info("ws.closed_stale_connection", { agentId });
        return;
      }

      activeAgentConnections.delete(agentId);
      markAgentDisconnected(agentId);
      const assignment = currentAssignment(agentId);
      clearPendingDecisions("Agent WebSocket disconnected.", assignment?.tableId, agentId);
      scheduleDisconnectedAgentLeave(agentId, origin);
      logger.info("ws.closed", { agentId, assignment });
    });
  });

  server.listen(port, hostname, () => {
    logger.info("server.ready", {
      url: `http://${hostname}:${port}`,
      wsUrl: `ws://${hostname}:${port}${wsPath}?agentId=<agent-id>`,
      nodeEnv: process.env.NODE_ENV ?? "development",
    });
  });

  let isShuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    logger.warn("server.shutdown_started", { signal });
    server.close(() => {
      logger.info("server.http_closed");
    });
    wss.close();

    void getTableManager(`http://${hostname}:${port}`)
      .endAllTables()
      .then(() => {
        logger.info("server.shutdown_tables_settled");
        process.exit(0);
      })
      .catch((error: unknown) => {
        logger.error("server.shutdown_settlement_failed", { error });
        process.exit(1);
      });
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

function clearDisconnectedAgentTimer(agentId: string) {
  const timer = disconnectedAgentTimers.get(agentId);
  if (!timer) {
    return;
  }

  clearTimeout(timer);
  disconnectedAgentTimers.delete(agentId);
  logger.info("agent.disconnected_leave_cancelled", { agentId });
}

function scheduleDisconnectedAgentLeave(agentId: string, origin: string) {
  clearDisconnectedAgentTimer(agentId);
  const timer = setTimeout(() => {
    disconnectedAgentTimers.delete(agentId);
    const agent = listAgents().find((item) => item.id === agentId);
    if (!agent || agent.assignmentStatus !== "disconnected") {
      logger.info("agent.disconnected_leave_skipped", { agentId, assignmentStatus: agent?.assignmentStatus });
      return;
    }

    logger.warn("agent.disconnected_leave_started", { agentId, graceMs: disconnectedAgentLeaveGraceMs });
    void getTableManager(origin)
      .leaveAgent(agentId)
      .then((result) => {
        logger.warn("agent.disconnected_leave_completed", { agentId, ...result });
      })
      .catch((error: unknown) => {
        logger.error("agent.disconnected_leave_failed", { agentId, error });
      });
  }, disconnectedAgentLeaveGraceMs);
  disconnectedAgentTimers.set(agentId, timer);
  logger.warn("agent.disconnected_leave_scheduled", { agentId, graceMs: disconnectedAgentLeaveGraceMs });
}

type AgentLeaveMessage = {
  type: "agent_leave";
  agentId?: string;
};

function handleQualificationWs(ws: WebSocket, request: IncomingMessage, url: URL) {
  const rawAgentId = url.searchParams.get("agentId")?.trim() ?? "";
  const qualificationId = url.searchParams.get("qualificationId")?.trim() ?? "";
  const origin = originFor(request);

  try {
    if (!rawAgentId) {
      throw new Error("agentId is required.");
    }
    if (!qualificationId) {
      throw new Error("qualificationId is required.");
    }

    const session = assertQualificationSession(rawAgentId, qualificationId);
    const requestTask = createQualificationWsTask(session.agentId, session.qualificationId);
    const task = {
      request: { ...requestTask, tableId: "qualification-table" },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
    };
    let acknowledged = false;
    let failed = false;

    logger.info("qualification.ws_connected", {
      agentId: session.agentId,
      qualificationId: session.qualificationId,
      remoteAddress: request.socket.remoteAddress,
    });
    send(ws, {
      type: "ws_welcome",
      agentId: session.agentId,
      shouldStop: false,
      qualificationId: session.qualificationId,
      runtimeInstructions: [],
    });
    send(ws, {
      type: "table_assigned",
      agentId: session.agentId,
      tableId: "qualification-table",
      tableUrl: `${origin}/tables/qualification-sandbox`,
      shouldStop: false,
    });
    send(ws, {
      type: "decision_task",
      agentId: session.agentId,
      tableId: "qualification-table",
      tableUrl: `${origin}/tables/qualification-sandbox`,
      qualificationId: session.qualificationId,
      runtimeInstructions: [],
      task,
    });

    const timeout = setTimeout(() => {
      if (acknowledged || failed) {
        return;
      }
      failed = true;
      logger.warn("qualification.ws_timeout", { agentId: session.agentId, qualificationId: session.qualificationId });
      send(ws, { type: "action_error", ok: false, error: "WebSocket qualification timed out before a valid action_response." });
      ws.close(1008, "WebSocket qualification timed out");
    }, 30_000);

    ws.on("message", (raw) => {
      try {
        const payload = JSON.parse(raw.toString()) as AgentDecisionResponse;
        if (acknowledged) {
          failed = true;
          logger.warn("qualification.ws_duplicate_submit", { agentId: session.agentId, qualificationId: session.qualificationId });
          send(ws, {
            type: "action_error",
            ok: false,
            error: "Duplicate action_response was submitted during WebSocket qualification.",
          });
          ws.close(1008, "Duplicate WebSocket qualification submit");
          return;
        }

        validateDecisionResponse(payload, task.request.legalActions);
        if (payload.requestId !== task.request.requestId) {
          throw new Error("WebSocket qualification response has wrong requestId.");
        }
        if (payload.playerId !== task.request.playerId) {
          throw new Error("WebSocket qualification response has wrong playerId.");
        }
        if (payload.tableId !== task.request.tableId) {
          throw new Error("WebSocket qualification response has wrong tableId.");
        }

        acknowledged = true;
        clearTimeout(timeout);
        send(ws, { type: "action_ack", ok: true, requestId: payload.requestId });
        send(ws, {
          type: "decision_task",
          agentId: session.agentId,
          tableId: "qualification-table",
          tableUrl: `${origin}/tables/qualification-sandbox`,
          qualificationId: session.qualificationId,
          runtimeInstructions: [],
          task,
        });
        send(ws, {
          type: "action_error",
          ok: false,
          recoverable: true,
          code: "qualification_recoverable_check",
          error: "Recoverable sandbox check. Continue listening.",
        });
        send(ws, { type: "heartbeat", agentId: session.agentId, shouldStop: false, at: new Date().toISOString() });
        setTimeout(() => {
          if (failed || ws.readyState !== WebSocket.OPEN) {
            return;
          }
          markQualificationWsPassed(session.agentId, session.qualificationId);
          send(ws, {
            type: "agent_stop",
            agentId: session.agentId,
            ok: true,
            shouldStop: true,
            qualificationId: session.qualificationId,
            reason: "WebSocket qualification passed. Continue with HTTP qualification submit.",
          });
          ws.close(1000, "WebSocket qualification passed");
        }, 1_000);
      } catch (error) {
        failed = true;
        clearTimeout(timeout);
        const message = error instanceof Error ? error.message : "Invalid WebSocket qualification response.";
        logger.warn("qualification.ws_rejected", { agentId: session.agentId, qualificationId: session.qualificationId, error: message });
        send(ws, { type: "action_error", ok: false, error: message });
        ws.close(1008, "Invalid WebSocket qualification response");
      }
    });

    ws.on("close", () => {
      clearTimeout(timeout);
      logger.info("qualification.ws_closed", { agentId: session.agentId, qualificationId: session.qualificationId });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start WebSocket qualification.";
    logger.warn("qualification.ws_connection_rejected", { error: message, remoteAddress: request.socket.remoteAddress });
    send(ws, { type: "agent_stop", shouldStop: true, reason: message });
    ws.close(1008, message);
  }
}

function sendAgentState(ws: WebSocket, agentId: string, type: "decision_task" | "ws_welcome", origin: string) {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }

  const agent = listAgents().find((item) => item.id === agentId);
  const tableUrl = agent?.tableId ? tableUrlFor(origin, agent.tableId) : undefined;
  const task = type === "decision_task" ? (getPendingDecision(agentId, agent?.tableId) ?? null) : null;
  if (type === "decision_task" && task) {
    logger.info("decision.task_sent", {
      agentId,
      tableId: task.request.tableId,
      handId: task.request.handId,
      requestId: task.request.requestId,
      legalActions: task.request.legalActions,
      expiresAt: task.expiresAt,
    });
  }

  send(ws, {
    type,
    agentId,
    shouldStop: false,
    tableId: agent?.tableId,
    tableUrl,
    runtimeInstructions: getRuntimeInstructions(agentId, task ? { tableId: task.request.tableId, handId: task.request.handId } : undefined),
    task,
  });
}

function sendAssignmentState(ws: WebSocket, agentId: string, preferredType?: "queue_status", origin = `http://${hostname}:${port}`) {
  const agent = listAgents().find((item) => item.id === agentId);

  if (!agent) {
    return;
  }

  const type = preferredType ?? (agent.tableId ? "table_assigned" : "queue_status");
  logger.debug("agent.assignment_state_sent", {
    agentId,
    type,
    assignmentStatus: agent.assignmentStatus,
    tableId: agent.tableId,
  });
  send(ws, {
    type,
    agentId,
    assignmentStatus: agent.assignmentStatus,
    queueEnteredAt: agent.queueEnteredAt,
    shouldStop: false,
    tableId: agent.tableId,
    tableUrl: agent.tableId ? tableUrlFor(origin, agent.tableId) : undefined,
  });
}

function currentAssignment(agentId: string) {
  const agent = listAgents().find((item) => item.id === agentId);
  if (!agent) {
    return undefined;
  }

  return {
    assignmentStatus: agent.assignmentStatus,
    queueEnteredAt: agent.queueEnteredAt,
    tableId: agent.tableId,
  };
}

function assignmentKey(assignment: ReturnType<typeof currentAssignment>) {
  return `${assignment?.assignmentStatus ?? "missing"}:${assignment?.tableId ?? ""}:${assignment?.queueEnteredAt ?? ""}`;
}

function send(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function isAgentLeaveMessage(payload: unknown): payload is AgentLeaveMessage {
  return typeof payload === "object" && payload !== null && "type" in payload && payload.type === "agent_leave";
}

function actionAmount(action: AgentDecisionResponse["action"] | undefined) {
  return action && "amount" in action ? action.amount : undefined;
}

function originFor(request: { headers: { host?: string | string[] } }) {
  const host = Array.isArray(request.headers.host) ? request.headers.host[0] : request.headers.host;
  return `http://${host ?? `${hostname}:${port}`}`;
}

function tableUrlFor(origin: string, tableId: string) {
  return `${origin}/tables/${encodeURIComponent(tableId)}`;
}

function parseArgs(args: string[]) {
  let hostname = "0.0.0.0";
  let port = Number(process.env.PORT ?? 3000);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextArg = args[index + 1];

    if ((arg === "--hostname" || arg === "-H") && nextArg) {
      hostname = nextArg;
      index += 1;
      continue;
    }

    if ((arg === "--port" || arg === "-p") && nextArg) {
      port = Number(nextArg);
      index += 1;
    }
  }

  return { hostname, port };
}
