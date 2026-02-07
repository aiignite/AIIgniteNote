-- AlterTable
ALTER TABLE "ai_templates" ADD COLUMN     "default_assistant_id" TEXT;

-- CreateIndex
CREATE INDEX "ai_templates_default_assistant_id_idx" ON "ai_templates"("default_assistant_id");

-- AddForeignKey
ALTER TABLE "ai_templates" ADD CONSTRAINT "ai_templates_default_assistant_id_fkey" FOREIGN KEY ("default_assistant_id") REFERENCES "ai_assistants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
