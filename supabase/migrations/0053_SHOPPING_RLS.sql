-- Migration 0053_SHOPPING_RLS.sql
-- Trainer (próprio + staff) gerencia listas de compras dos alunos.
-- IDEMPOTENTE.

ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopping_lists_trainer_all" ON public.shopping_lists;
CREATE POLICY "shopping_lists_trainer_all" ON public.shopping_lists
  FOR ALL TO authenticated
  USING (public.trainer_scope_has_access(trainer_id))
  WITH CHECK (public.trainer_scope_has_access(trainer_id));

DROP POLICY IF EXISTS "shopping_list_items_trainer_all" ON public.shopping_list_items;
CREATE POLICY "shopping_list_items_trainer_all" ON public.shopping_list_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shopping_lists sl
    WHERE sl.id = shopping_list_items.shopping_list_id
      AND public.trainer_scope_has_access(sl.trainer_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.shopping_lists sl
    WHERE sl.id = shopping_list_items.shopping_list_id
      AND public.trainer_scope_has_access(sl.trainer_id)
  ));
