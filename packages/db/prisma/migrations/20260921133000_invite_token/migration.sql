-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "invite_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "matches_invite_token_key" ON "matches"("invite_token");

