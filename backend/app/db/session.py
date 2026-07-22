from supabase import create_client, Client
from app.core.config import settings

# Initialize Supabase Client with service role key to bypass RLS in the backend
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key
)
