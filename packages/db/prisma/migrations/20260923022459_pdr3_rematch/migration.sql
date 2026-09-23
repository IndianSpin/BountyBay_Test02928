-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "rematch_from_match_id" UUID,
ADD COLUMN     "rematch_opponent_user_id" UUID;
