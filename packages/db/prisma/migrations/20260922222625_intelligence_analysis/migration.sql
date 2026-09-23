-- CreateTable
CREATE TABLE "match_features" (
    "match_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "feature_engine_version" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_features_pkey" PRIMARY KEY ("match_id","player_id")
);

-- CreateTable
CREATE TABLE "match_observations" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "observation_engine_version" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "magnitude" DECIMAL(14,6),
    "measurements" JSONB NOT NULL,
    "event_refs" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_observations_match_id_player_id_idx" ON "match_observations"("match_id", "player_id");

-- AddForeignKey
ALTER TABLE "match_features" ADD CONSTRAINT "match_features_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_observations" ADD CONSTRAINT "match_observations_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
