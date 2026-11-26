# My PYQ Online UI and stability update

Merge the files in this ZIP into the matching paths of the existing My PYQ Online project and deploy the project through Vercel. This archive includes the preceding Study Upgrades files. If that release is already installed, the database is ready. If you skipped it, run the included supabase/study-upgrades.sql against your existing Supabase project. The UI update itself has no database migration. Keep the existing config.js, banks and images.

Open the deployment online once so the updated service worker can cache the new pages. Existing subject IDs and question IDs continue to identify progress. No workbook upload is needed.

For a deployment check, open one subject on iPad, select a section and search for a chapter. Start the chapter test, answer a question, end the test and use Chapters. The selected section and search should return. Open Home and check the attempt under Performance. In a two-device live room, submit an answer on one device while watching the unanswered question on the other. Check the roster count, answer privacy and focus, then reconnect and confirm one seat per user.
