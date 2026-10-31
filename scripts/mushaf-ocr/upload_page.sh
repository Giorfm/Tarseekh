#!/bin/sh
# Upload one page image to Supabase Storage. Args: <file>
f="$1"; name=$(basename "$f")
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/mushaf/kfgqpc-1441/$name" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: image/webp" -H "cache-control: max-age=31536000, immutable" -H "x-upsert: true" --data-binary "@$f")
echo "$name $code"
