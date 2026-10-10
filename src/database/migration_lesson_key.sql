-- Migração: suporte a lesson_key (IDs string do frontend)
-- Corre este script no pgAdmin4: Tools → Query Tool → colar e executar

-- 1. Torna aula_id nullable (as lições do frontend não têm FK no DB)
ALTER TABLE progresso
  ALTER COLUMN aula_id DROP NOT NULL;

-- 2. Adiciona lesson_key para guardar o ID string do frontend (ex: 'python-1', 'java-2')
ALTER TABLE progresso
  ADD COLUMN IF NOT EXISTS lesson_key TEXT;

-- 3. Adiciona language_id para saber de que linguagem é a lição
ALTER TABLE progresso
  ADD COLUMN IF NOT EXISTS language_id TEXT;

-- 4. Índice para consultas rápidas por utilizador + linguagem
CREATE INDEX IF NOT EXISTS idx_progresso_usuario_language
  ON progresso (usuario_id, language_id);

-- 5. Índice único para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_progresso_usuario_lesson
  ON progresso (usuario_id, lesson_key)
  WHERE lesson_key IS NOT NULL;

-- Verificar resultado
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'progresso'
ORDER BY ordinal_position;
