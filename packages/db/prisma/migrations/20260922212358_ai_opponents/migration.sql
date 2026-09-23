-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "ai_persona_key" TEXT,
ADD COLUMN     "ai_persona_version" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_bot" BOOLEAN NOT NULL DEFAULT false;
