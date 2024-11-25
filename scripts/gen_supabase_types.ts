import {$} from "bun"
import {config} from "dotenv"

config()

const supabaseProjectId = process.env.SUPABASE_PROJECT_ID

if (!supabaseProjectId) {
    throw new Error("SUPABASE_PROJECT_ID is not set")
}

await $`supabase gen types --lang=typescript  --project-id "${supabaseProjectId}" --schema public > ./src/types/database.types.ts`