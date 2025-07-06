-- supabase/migrations/0001_functions_and_triggers.sql

-- This script creates the necessary database functions and triggers for the application.

-- 1. Function to create a profile for a new user automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert a new profile for the new user, taking the username from the metadata provided at sign-up.
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$;

-- 2. Trigger to call handle_new_user on new user creation in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. RPC function to link partners when an invitation is accepted
CREATE OR REPLACE FUNCTION public.link_partners(
    p_inviter_id uuid,
    p_invitee_id uuid,
    p_invitation_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Update both profiles with each other's ID, establishing the partnership.
    UPDATE public.profiles
    SET partner_id = p_invitee_id
    WHERE id = p_inviter_id;

    UPDATE public.profiles
    SET partner_id = p_inviter_id
    WHERE id = p_invitee_id;

    -- Mark the invitation as 'accepted'
    UPDATE public.couple_invitations
    SET status = 'accepted'
    WHERE id = p_invitation_id;
END;
$$;

-- 4. RPC function to unlink partners
CREATE OR REPLACE FUNCTION public.unlink_partners(
    user_id_1 uuid,
    user_id_2 uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_1_email text;
  user_2_email text;
BEGIN
    -- Retrieve emails to delete any pending invitations between them
    SELECT email INTO user_1_email FROM auth.users WHERE id = user_id_1;
    SELECT email INTO user_2_email FROM auth.users WHERE id = user_id_2;

    -- Set partner_id to NULL for the first user
    UPDATE public.profiles
    SET partner_id = NULL
    WHERE id = user_id_1;

    -- Set partner_id to NULL for the second user
    UPDATE public.profiles
    SET partner_id = NULL
    WHERE id = user_id_2;

    -- Clean up any residual pending invitations
    DELETE FROM public.couple_invitations
    WHERE (inviter_id = user_id_1 AND invitee_email = user_2_email AND status = 'pending')
       OR (inviter_id = user_id_2 AND invitee_email = user_1_email AND status = 'pending');
END;
$$;
