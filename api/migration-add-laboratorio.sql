-- Rode este arquivo SOMENTE se seu banco feedbacks já existia antes da adição de Laboratório.
-- Se você criou o banco do zero usando api/schema.sql atualizado, não precisa rodar esta migration.

ALTER TABLE feedbacks ADD COLUMN laboratorio_nota INTEGER CHECK (laboratorio_nota IS NULL OR laboratorio_nota BETWEEN 1 AND 5);
ALTER TABLE feedbacks ADD COLUMN laboratorio_comentario TEXT;
CREATE INDEX IF NOT EXISTS idx_feedbacks_laboratorio_nota ON feedbacks(laboratorio_nota);
