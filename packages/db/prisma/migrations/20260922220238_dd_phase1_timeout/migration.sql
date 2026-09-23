-- AlterEnum
ALTER TYPE "CompletionReason" ADD VALUE 'TIMED_OUT';

-- AlterTable
ALTER TABLE "game_balance_configs" ADD COLUMN     "hard_decision_time_limit_ms" BIGINT,
ADD COLUMN     "time_warning_critical_ms" INTEGER,
ADD COLUMN     "time_warning_low_ms" INTEGER,
ADD COLUMN     "timeout_policy" TEXT;

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "timeout_player_id" UUID;
