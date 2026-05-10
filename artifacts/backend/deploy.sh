#!/bin/bash
set -e

gcloud config set project replycash

gcloud run deploy nylaia-api \
  --image gcr.io/replycash/nylaia-api \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --set-env-vars "SUPABASE_URL=https://yyvorhvkigtrvlsrmgzo.supabase.co,SUPABASE_SERVICE_ROLE_KEY=\${SUPABASE_SERVICE_ROLE_KEY},GROQ_API_KEY=\${GROQ_API_KEY}"
