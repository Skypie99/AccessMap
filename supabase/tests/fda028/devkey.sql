-- PGTAP_KIND: fixture
-- Dev key store, LOCAL ONLY. The forward candidate never creates this table;
-- where Vault exists the Vault branch is taken and this is unreachable.
CREATE TABLE IF NOT EXISTS limiter.dev_key_material (
  id boolean PRIMARY KEY DEFAULT true CHECK (id), k text);
INSERT INTO limiter.dev_key_material (id, k) VALUES (true, NULL) ON CONFLICT DO NOTHING;
