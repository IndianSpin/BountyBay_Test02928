-- AlterTable
ALTER TABLE "scenarios" ADD COLUMN     "buyer_private_context" TEXT,
ADD COLUMN     "buyer_private_facts" JSONB,
ADD COLUMN     "seller_private_context" TEXT,
ADD COLUMN     "seller_private_facts" JSONB,
ADD COLUMN     "shared_context" TEXT;
