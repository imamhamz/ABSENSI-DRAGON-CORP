import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
export const supabase = createClient(
  "https://ihwqgxxwbrbbqqhjmoxz.supabase.co",
  "sb_publishable_RgEkyhJtoz0QWB10oUwA_g_Ngxpdp1q"
);
export const EMPLOYEE_TABLE = "absensi-dragon-corp";
export const ATTENDANCE_TABLE = "attendance";
export const PHOTO_BUCKET = "attendance-photos";
