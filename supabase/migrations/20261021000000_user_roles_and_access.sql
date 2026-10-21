-- ========================================================
-- Migration: Gestión de Acceso y Roles (LVC)
-- Roles: 'admin' (Administrativo), 'delegado' (Delegado de Liga), 'pending' (Pendiente de Autorización)
-- Super Usuario: 'angel.aleman1414@gmail.com'
-- ========================================================

-- 1. Actualizar roles existentes ('user' -> 'delegado') para estandarizar nomenclatura
UPDATE public.profiles 
SET role = 'delegado' 
WHERE role = 'user' AND email <> 'angel.aleman1414@gmail.com' AND email <> 'admin@lvc.com';

-- 2. Asegurar que la cuenta del Super Usuario esté configurada permanentemente como 'admin'
UPDATE public.profiles
SET role = 'admin'
WHERE lower(email) = 'angel.aleman1414@gmail.com' OR lower(email) = 'admin@lvc.com';

-- 3. Trigger actualizado para la creación de nuevos usuarios
-- Las nuevas cuentas se registran con rol 'pending' a la espera de autorización administrativa
-- o con el rol especificado por el administrador durante la creación.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF lower(new.email) = 'angel.aleman1414@gmail.com' THEN
        v_role := 'admin';
    ELSE
        v_role := coalesce(new.raw_user_meta_data->>'role', 'pending');
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        v_role
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = coalesce(EXCLUDED.full_name, public.profiles.full_name),
        role = CASE 
            WHEN lower(EXCLUDED.email) = 'angel.aleman1414@gmail.com' THEN 'admin'
            ELSE coalesce(public.profiles.role, EXCLUDED.role)
        END;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
