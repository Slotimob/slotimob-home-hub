INSERT INTO public.user_roles (user_id, role)
VALUES ('b52081c9-b184-4125-bd09-69f90b2b94a3', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;