import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://ihwqgxxwbrbbqqhjmoxz.supabase.co";
const SUPABASE_KEY = "sb_publishable_RgEkyhJtoz0QWB10oUwA_g_Ngxpdp1q";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
