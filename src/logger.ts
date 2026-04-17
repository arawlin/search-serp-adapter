import { pino } from "pino";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const logDir = path.join(os.tmpdir(), "search-serp-adapter-logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFilePath = path.join(logDir, "search-serp-adapter.log");

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: {
    targets: [
      {
        target: "pino-pretty",
        level: "info",
        options: {
          colorize: false,
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
      {
        target: "pino/file",
        level: "trace",
        options: { destination: logFilePath },
      },
    ],
  },
});

export default logger;