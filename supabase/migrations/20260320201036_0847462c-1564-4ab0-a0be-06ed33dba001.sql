-- Remove dangerous UPDATE policy that allows users to self-upgrade subscriptions
-- All subscription mutations are handled by stripe-webhook edge function and admin RPCs
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;