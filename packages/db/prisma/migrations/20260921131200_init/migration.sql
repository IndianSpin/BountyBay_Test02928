-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "ScenarioStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "MatchMode" AS ENUM ('RANKED_LIVE', 'FRIEND_LIVE', 'AI', 'ASYNC');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('CREATED', 'READY', 'ACTIVE', 'PAUSED', 'DEAL', 'NO_DEAL', 'ABORTED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BUYER', 'SELLER');

-- CreateEnum
CREATE TYPE "CompletionReason" AS ENUM ('ACCEPTED', 'WALKED_AWAY', 'ABORTED');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('VISIBLE', 'REDACTED', 'FLAGGED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "auth_subject" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_profiles" (
    "user_id" UUID NOT NULL,
    "bounty_rating" INTEGER NOT NULL DEFAULT 1200,
    "rating_version" TEXT,
    "rated_games" INTEGER NOT NULL DEFAULT 0,
    "rated_deals" INTEGER NOT NULL DEFAULT 0,
    "rated_no_deals" INTEGER NOT NULL DEFAULT 0,
    "agreement_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "avg_surplus_share" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "scenarios" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "buyer_batna_narrative" TEXT NOT NULL,
    "seller_batna_narrative" TEXT NOT NULL,
    "status" "ScenarioStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_balance_configs" (
    "version" TEXT NOT NULL,
    "match_bounty_chips" INTEGER NOT NULL,
    "concession_budget_chips" INTEGER NOT NULL,
    "concession_k" DECIMAL(10,6) NOT NULL,
    "concession_alpha" DECIMAL(10,6) NOT NULL,
    "clock_floor_multiplier" DECIMAL(5,4) NOT NULL,
    "clock_floor_ms" BIGINT NOT NULL,
    "turn_grace_ms" INTEGER NOT NULL,
    "max_amount_tenths" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active_for_new_matches" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "game_balance_configs_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "mode" "MatchMode" NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'CREATED',
    "scenario_id" UUID NOT NULL,
    "scenario_version" INTEGER NOT NULL,
    "game_rules_version" TEXT NOT NULL,
    "economy_config_version" TEXT NOT NULL,
    "rating_version" TEXT,
    "first_player_id" UUID,
    "active_player_id" UUID,
    "settlement_amount_tenths" BIGINT,
    "completion_reason" "CompletionReason",
    "event_sequence" BIGINT NOT NULL DEFAULT 0,
    "domain_state" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_participants" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "reservation_value_tenths" BIGINT NOT NULL,
    "initial_chip_budget" INTEGER NOT NULL,
    "chips_spent" INTEGER NOT NULL DEFAULT 0,
    "cumulative_active_ms" BIGINT NOT NULL DEFAULT 0,
    "opening_offer_tenths" BIGINT,
    "latest_offer_tenths" BIGINT,
    "disconnected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "event_sequence" BIGINT NOT NULL,
    "player_id" UUID NOT NULL,
    "amount_tenths" BIGINT NOT NULL,
    "is_opening" BOOLEAN NOT NULL,
    "concession_magnitude" DECIMAL(12,8),
    "concession_cost_chips" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "event_sequence" BIGINT NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'VISIBLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_events" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "sequence" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "actor_user_id" UUID,
    "command_id" UUID,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_results" (
    "match_id" UUID NOT NULL,
    "zopa_tenths" BIGINT NOT NULL,
    "buyer_surplus_share" DECIMAL(8,6),
    "seller_surplus_share" DECIMAL(8,6),
    "buyer_clock_multiplier" DECIMAL(8,6) NOT NULL,
    "seller_clock_multiplier" DECIMAL(8,6) NOT NULL,
    "buyer_gross_reward" DECIMAL(14,6) NOT NULL,
    "seller_gross_reward" DECIMAL(14,6) NOT NULL,
    "buyer_net_result" DECIMAL(14,6) NOT NULL,
    "seller_net_result" DECIMAL(14,6) NOT NULL,
    "rated_eligible" BOOLEAN NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_results_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable
CREATE TABLE "rating_events" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating_version" TEXT NOT NULL,
    "rating_before" INTEGER NOT NULL,
    "rating_after" INTEGER NOT NULL,
    "opponent_rating_before" INTEGER NOT NULL,
    "performance_input" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rating_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_subject_key" ON "users"("auth_subject");

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "scenarios_id_version_key" ON "scenarios"("id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "match_participants_match_id_role_key" ON "match_participants"("match_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "match_participants_match_id_user_id_key" ON "match_participants"("match_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "offers_match_id_event_sequence_key" ON "offers"("match_id", "event_sequence");

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_match_id_event_sequence_key" ON "chat_messages"("match_id", "event_sequence");

-- CreateIndex
CREATE UNIQUE INDEX "match_events_match_id_sequence_key" ON "match_events"("match_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "match_events_match_id_command_id_key" ON "match_events"("match_id", "command_id");

-- AddForeignKey
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating_events" ADD CONSTRAINT "rating_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating_events" ADD CONSTRAINT "rating_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
