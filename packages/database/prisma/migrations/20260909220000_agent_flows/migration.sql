-- Agent Flow tables for conversation/business flow graphs
CREATE TABLE IF NOT EXISTS "AgentFlow" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "AgentStatus" NOT NULL DEFAULT 'DRAFT',
  "draftGraph" JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  "activeVersionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "AgentFlow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AgentFlow_organizationId_status_idx" ON "AgentFlow"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "AgentFlow_organizationId_createdAt_idx" ON "AgentFlow"("organizationId", "createdAt");

CREATE TABLE IF NOT EXISTS "AgentFlowVersion" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "flowId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "AgentVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "graph" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentFlowVersion_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "AgentFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentFlowVersion_flowId_versionNumber_key" ON "AgentFlowVersion"("flowId", "versionNumber");
CREATE INDEX IF NOT EXISTS "AgentFlowVersion_organizationId_flowId_idx" ON "AgentFlowVersion"("organizationId", "flowId");
