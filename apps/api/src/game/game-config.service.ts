import { BadRequestException, Injectable } from "@nestjs/common";
import { GameConfig, Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

const SINGLETON_ID = "singleton";

/** Every round page (initial + each "load more") always serves this many questions. */
export const PAGE_SIZE = 12;

const DEFAULT_POINTS_PER_CORRECT = 10;

export interface DifficultyMixEntry {
  difficulty: number;
  count: number;
}

export interface PointsPerDifficultyEntry {
  difficulty: number;
  points: number;
}

export type UpdateGameConfigInput = Partial<
  Omit<GameConfig, "id" | "updatedAt" | "difficultyMix" | "pointsPerDifficulty">
> & {
  difficultyMix?: DifficultyMixEntry[];
  pointsPerDifficulty?: PointsPerDifficultyEntry[];
};

// The config changes only when an admin edits it, but get() sits on the hottest gameplay
// paths (every start/answer/next). Cache the singleton in memory so those calls don't hit
// the DB; update() refreshes the cache so admin edits are reflected immediately.
const CACHE_TTL_MS = 60_000;

/** Reads/writes the single admin-configurable GameConfig row (auto-created with defaults). */
@Injectable()
export class GameConfigService {
  constructor(private readonly prisma: PrismaService) {}

  private cached: GameConfig | null = null;
  private cachedAt = 0;

  async get(): Promise<GameConfig> {
    const now = Date.now();
    if (this.cached && now - this.cachedAt < CACHE_TTL_MS) return this.cached;

    // Cache miss: a plain read (not a write). Auto-create the singleton only the first time.
    const config =
      (await this.prisma.gameConfig.findUnique({ where: { id: SINGLETON_ID } })) ??
      (await this.prisma.gameConfig.create({ data: { id: SINGLETON_ID } }));
    this.cache(config);
    return config;
  }

  private cache(config: GameConfig): void {
    this.cached = config;
    this.cachedAt = Date.now();
  }

  /** Parsed, always-valid difficulty mix (falls back to an even split if the stored value is malformed). */
  async difficultyMix(): Promise<DifficultyMixEntry[]> {
    const cfg = await this.get();
    const mix = cfg.difficultyMix as unknown as DifficultyMixEntry[];
    if (Array.isArray(mix) && mix.length > 0 && mix.reduce((sum, m) => sum + m.count, 0) === PAGE_SIZE) {
      return mix;
    }
    return [{ difficulty: 1, count: PAGE_SIZE }];
  }

  /** Parsed, always-valid per-difficulty point values. */
  async pointsPerDifficulty(): Promise<PointsPerDifficultyEntry[]> {
    const cfg = await this.get();
    const points = cfg.pointsPerDifficulty as unknown as PointsPerDifficultyEntry[];
    if (Array.isArray(points) && points.length > 0) return points;
    return [];
  }

  /** Points awarded for a correct answer at a given question difficulty. */
  async pointsForDifficulty(difficulty: number): Promise<number> {
    const points = await this.pointsPerDifficulty();
    return points.find((p) => p.difficulty === difficulty)?.points ?? DEFAULT_POINTS_PER_CORRECT;
  }

  async update(patch: UpdateGameConfigInput): Promise<GameConfig> {
    if (patch.difficultyMix) {
      const total = patch.difficultyMix.reduce((sum, m) => sum + m.count, 0);
      if (total !== PAGE_SIZE) {
        throw new BadRequestException(`مجموع تعداد سوالات هر سطح باید ${PAGE_SIZE} باشد (فعلا ${total})`);
      }
    }
    const data = {
      ...patch,
      difficultyMix: patch.difficultyMix as Prisma.InputJsonValue | undefined,
      pointsPerDifficulty: patch.pointsPerDifficulty as Prisma.InputJsonValue | undefined,
    };
    const updated = await this.prisma.gameConfig.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });
    this.cache(updated); // reflect the edit immediately for the hot read path
    return updated;
  }
}
