# My PYQ Online study upgrade

## Install
1. Run supabase/study-upgrades.sql in the SQL Editor for the Supabase project used by the portal. The migration expects the existing subjects, user_data and admin schema. It can be run again.
2. Copy the website files in this ZIP into the matching paths in your existing project and deploy it through your normal Vercel workflow. Keep your existing config.js, subject banks, images and live-room backend. This package is an update for the project, not a standalone deployment.
3. Open the deployed site online and reload once to activate the updated service worker. Use the existing subject and account to check prior progress. This upgrade requires no question-bank reimport.

## Where to find the features
- Subject builder → Mistake notebook. Tag a previous error as a concept gap, misread or guess, then retry one question or the filtered list.
- Subject builder → Daily revision. Choose a 10-, 20- or 30-minute budget. Estimated length uses 90 seconds per question.
- Subject builder or Analysis → Exam priorities. Select the exam and year to rank chapters by exam question count and personal accuracy.
- Test question → Confidence. Record Sure, Unsure or Guess. The revision queue uses the saved confidence alongside incorrect and due responses.
- Subject builder → Original papers. Filter by exam, year, stage and shift. For a verified paper, import a unique Paper ID, Paper number and Paper total for questions with a single exam tag. Missing numbering yields a partial collection. Conflicting positions require correction. Original-paper attempts can be opened in Performance.
- Home → Performance → select an attempt. Review answers with wrong, skipped and slow-correct filters. Time and confidence depend on what was recorded for that attempt.
- Live host → room panel. Monitor response counts and reconnecting members. Practice shows the option distribution after reveal. The results include a question-by-question distribution.
- Test question → Report. In Admin, open the report to correct the key or explanation, enter a revision note and publish the correction against the existing question ID.
- Admin → replace a subject file. Inspect the change counts before publishing. The impact count covers distinct changed IDs found in synced question statistics. Rollback republishes the previous retained bank. Edition history starts when the migration is applied. Keep historical bank objects in storage.
- Subject builder → Offline practice. Sign in and download the subject on the device while online. Wait for the ready message before going offline. Solo practice uses that download and queues progress for sync when connectivity returns. Browser storage must remain available.
