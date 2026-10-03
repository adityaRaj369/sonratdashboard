-- AlterTable
ALTER TABLE "AgentFlow" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AgentFlowVersion" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "UserWorkspaceState" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "pinnedServices" JSONB NOT NULL DEFAULT '[]',
    "recentServices" JSONB NOT NULL DEFAULT '[]',
    "bookmarks" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWorkspaceState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserWorkspaceState_userId_key" ON "UserWorkspaceState"("userId");

-- CreateIndex
CREATE INDEX "UserWorkspaceState_userId_idx" ON "UserWorkspaceState"("userId");

-- AddForeignKey
ALTER TABLE "UserWorkspaceState" ADD CONSTRAINT "UserWorkspaceState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
