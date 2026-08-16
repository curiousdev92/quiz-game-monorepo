import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, Worker, ConnectionOptions } from "bullmq";

import { buildRedisOptions } from "../redis/redis.config";
import { WeeklyCloseService, previousWeekKey } from "./weekly-close.service";

const QUEUE = "weekly-close";
// Every Monday 00:05 UTC — close the ISO week that just ended (prizes stay weekly).
const WEEKLY_CRON = "5 0 * * 1";

/**
 * Owns the BullMQ queue + worker for the weekly close. Registers a repeatable
 * cron job on boot; the worker runs WeeklyCloseService. Manual runs go through
 * enqueue() (admin endpoint) or WeeklyCloseService directly.
 */
@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly weeklyClose: WeeklyCloseService,
  ) {}

  private connection(): ConnectionOptions {
    // BullMQ requires maxRetriesPerRequest: null; reuse the shared Redis config
    // so managed Redis (password/TLS) works for the queue + worker too.
    return { ...buildRedisOptions(this.config), maxRetriesPerRequest: null } as ConnectionOptions;
  }

  async onModuleInit(): Promise<void> {
    const connection = this.connection();
    this.queue = new Queue(QUEUE, { connection });
    this.worker = new Worker(
      QUEUE,
      async (job) => {
        const weekKey = (job.data?.weekKey as string | undefined) ?? previousWeekKey();
        return this.weeklyClose.close(weekKey);
      },
      { connection },
    );
    this.worker.on("failed", (job, err) => this.logger.error(`Job ${job?.id} failed: ${err.message}`));

    // Idempotent repeatable registration (same key just updates the schedule).
    await this.queue.add("scheduled", {}, { repeat: { pattern: WEEKLY_CRON }, jobId: "weekly-close-cron" });
    this.logger.log(`Weekly-close cron registered (${WEEKLY_CRON})`);
  }

  /** Enqueue a close run (used by the admin endpoint for the async path). */
  async enqueue(weekKey?: string): Promise<string> {
    if (!this.queue) throw new Error("Jobs queue not ready");
    const job = await this.queue.add("manual", { weekKey });
    return job.id ?? "unknown";
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
