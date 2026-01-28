import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://ehbhdfsfllsglvnpmhor.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImM4ZTQ3NDZlLTA0ZTYtNDM3OC1iNTRkLWNhMTk4MjcxODI5YSJ9.eyJwcm9qZWN0SWQiOiJlaGJoZGZzZmxsc2dsdm5wbWhvciIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY5Mzk4MjgyLCJleHAiOjIwODQ3NTgyODIsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.li3DabC7zPRpasD5QjOckU14DGhf2G_hCULaRxHnBgY';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };