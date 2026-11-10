-- CreateEnum
CREATE TYPE "OrigemLancamento" AS ENUM ('manual', 'pdf', 'ofx');

-- AlterTable
ALTER TABLE "lancamentos" ADD COLUMN     "chave_importacao" TEXT,
ADD COLUMN     "fitid" TEXT,
ADD COLUMN     "origem" "OrigemLancamento" NOT NULL DEFAULT 'manual',
ADD COLUMN     "parcela_numero" INTEGER,
ADD COLUMN     "parcela_total" INTEGER,
ADD COLUMN     "parcelamento_id" TEXT;

-- CreateIndex
CREATE INDEX "lancamentos_usuario_id_chave_importacao_idx" ON "lancamentos"("usuario_id", "chave_importacao");

-- CreateIndex
CREATE INDEX "lancamentos_usuario_id_fitid_idx" ON "lancamentos"("usuario_id", "fitid");

-- CreateIndex
CREATE INDEX "lancamentos_parcelamento_id_idx" ON "lancamentos"("parcelamento_id");

