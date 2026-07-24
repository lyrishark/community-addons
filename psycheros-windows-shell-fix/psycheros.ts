const DEFAULT_TIMEOUT_MS = 30_000;

interface ToolResult {
  toolCallId: string;
  content: string;
  isError: boolean;
}

interface ToolContext {
  toolCallId: string;
}

interface ShellToolArgs {
  command: string;
  workingDir?: string;
  timeout?: number;
}

interface ShellInvocation {
  executable: string;
  args: string[];
}

interface Tool {
  definition: {
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  };
  execute: (
    args: Record<string, unknown>,
    context: ToolContext,
  ) => Promise<ToolResult>;
}

function isValidCommand(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalPositiveNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && value > 0);
}

export function parseArgs(args: Record<string, unknown>): ShellToolArgs {
  const { command, workingDir, timeout } = args;
  if (!isValidCommand(command)) {
    throw new Error("Shell tool requires a non-empty 'command' argument");
  }
  if (!isOptionalString(workingDir)) {
    throw new Error("'workingDir' must be a string if provided");
  }
  if (!isOptionalPositiveNumber(timeout)) {
    throw new Error("'timeout' must be a positive number if provided");
  }
  return { command: command.trim(), workingDir, timeout };
}

export function getShellInvocations(
  command: string,
  os: typeof Deno.build.os = Deno.build.os,
): ShellInvocation[] {
  if (os === "windows") {
    return [
      {
        executable: "powershell.exe",
        args: [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          command,
        ],
      },
      {
        executable: "cmd.exe",
        args: ["/d", "/s", "/c", command],
      },
    ];
  }
  return [{ executable: "sh", args: ["-c", command] }];
}

const SECRET_LABEL =
  "(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|secret|password)";
const QUOTED_SECRET_LABEL = "(?:" + SECRET_LABEL + "|auth(?:orization)?)";

export function redactSecrets(value: string): string {
  let redacted = value
    .replace(
      /\b(Authorization\s*[:=]\s*)(Bearer|Token)\s+[A-Za-z0-9._~+/=-]{12,}/gi,
      "$1$2 [REDACTED]",
    )
    .replace(
      /\b(Authorization\s*[:=]\s*)(?!Bearer\b|Token\b|\[REDACTED\])([^\s,;}]+)/gi,
      "$1[REDACTED]",
    );

  redacted = redacted.replace(
    new RegExp(
      "((?:[\"']?" + QUOTED_SECRET_LABEL +
        "[\"']?)\\s*[:=]\\s*)([\"'])([^\"'\\r\\n]+)\\2",
      "gi",
    ),
    "$1$2[REDACTED]$2",
  );
  redacted = redacted.replace(
    new RegExp(
      "(\\b" + SECRET_LABEL +
        "\\b\\s*[:=]\\s*)(?![\"']|\\[REDACTED\\])([^\\s,;}\\]]+)",
      "gi",
    ),
    "$1[REDACTED]",
  );
  return redacted
    .replace(/\b(Bearer|Token)\s+[A-Za-z0-9._~+/=-]{12,}/gi, "$1 [REDACTED]")
    .replace(
      /\b(?:sk-(?:or-v1-)?[A-Za-z0-9_-]{12,}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16}|eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/g,
      "[REDACTED]",
    );
}

async function runInvocation(
  invocation: ShellInvocation,
  args: ShellToolArgs,
  timeoutMs: number,
): Promise<Deno.CommandOutput> {
  const process = new Deno.Command(invocation.executable, {
    args: invocation.args,
    cwd: args.workingDir,
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  return await new Promise<Deno.CommandOutput>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      try {
        process.kill("SIGTERM");
      } catch {
        // The process may already have exited.
      }
      reject(new Error("Command timed out after " + timeoutMs + "ms"));
    }, timeoutMs);

    process.output().then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function isMissingExecutableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /entity not found|no such file|os error 2|not found/i.test(message);
}

export async function executeCommand(
  args: ShellToolArgs,
  toolCallId: string,
): Promise<ToolResult> {
  const timeoutMs = args.timeout ?? DEFAULT_TIMEOUT_MS;
  const invocations = getShellInvocations(args.command);
  try {
    let result: Deno.CommandOutput | undefined;
    let lastSpawnError: unknown;
    for (let index = 0; index < invocations.length; index += 1) {
      try {
        result = await runInvocation(invocations[index], args, timeoutMs);
        lastSpawnError = undefined;
        break;
      } catch (error) {
        lastSpawnError = error;
        if (
          index === invocations.length - 1 ||
          !isMissingExecutableError(error)
        ) {
          throw error;
        }
      }
    }
    if (!result) {
      throw lastSpawnError instanceof Error
        ? lastSpawnError
        : new Error("Command did not produce a result");
    }

    const decoder = new TextDecoder();
    const stdout = redactSecrets(decoder.decode(result.stdout));
    const stderr = redactSecrets(decoder.decode(result.stderr));
    const parts: string[] = [];
    if (stdout.length > 0) parts.push(stdout);
    if (stderr.length > 0) parts.push("[stderr]\n" + stderr);
    if (result.code !== 0) parts.push("[exit code: " + result.code + "]");
    return {
      toolCallId,
      content: parts.length > 0 ? parts.join("\n") : "(no output)",
      isError: result.code !== 0,
    };
  } catch (error) {
    const message = redactSecrets(
      error instanceof Error ? error.message : String(error),
    );
    return {
      toolCallId,
      content: "Error executing command: " + message,
      isError: true,
    };
  }
}

export const shellTool: Tool = {
  definition: {
    type: "function",
    function: {
      name: "shell",
      description:
        "Execute a command through the host platform shell and return stdout, stderr, and exit status.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The shell command to execute",
          },
          workingDir: {
            type: "string",
            description: "Optional working directory",
          },
          timeout: {
            type: "number",
            description: "Optional timeout in milliseconds (default: 30000)",
          },
        },
        required: ["command"],
      },
    },
  },
  execute: async (
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    try {
      return await executeCommand(parseArgs(args), context.toolCallId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        toolCallId: context.toolCallId,
        content: "Error: " + message,
        isError: true,
      };
    }
  },
};

export default {
  tools: [shellTool],
};
