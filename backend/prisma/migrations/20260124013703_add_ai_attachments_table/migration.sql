-- Create AIAttachments table
CREATE TABLE "ai_attachments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_attachments_pkey" PRIMARY KEY ("id")
);

-- Create index
CREATE INDEX "ai_attachments_userId_idx" ON "ai_attachments"("userId");
CREATE INDEX "ai_attachments_createdAt_idx" ON "ai_attachments"("createdAt" DESC);

-- Add foreign key constraint
ALTER TABLE "ai_attachments" ADD CONSTRAINT "ai_attachments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
