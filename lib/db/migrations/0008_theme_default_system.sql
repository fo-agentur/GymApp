-- 0008_theme_default_system
-- The theme column was never exposed in the UI, so every row still held the
-- old default 'dark'. v2.1 ships a visible theme picker (Hell/Dunkel/System)
-- that follows the device by default — reset the default and the existing
-- never-chosen values so profiles.theme can act as the cross-device source
-- of truth.
alter table public.profiles alter column theme set default 'system';
update public.profiles set theme = 'system' where theme = 'dark';
