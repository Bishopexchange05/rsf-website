#!/usr/bin/env bash
# Nightly backup of the database (see docs/OPERATIONS-PLAN.md section 4).
#
#   1. dump the application data (schemas public and private) and the login accounts (auth users,
#      identities, two-step factors) through a READ-ONLY database user;
#   2. PROVE the dump restores: load it into a throwaway Postgres and compare row counts;
#   3. encrypt with the owner's PUBLIC key (only the owner's private key can open it);
#   4. store the encrypted files in a separate PRIVATE repository, keeping the last 14 daily
#      and 12 monthly backups, as a single snapshot commit so history never piles up.
#
# Needs these environment variables (set by the workflow from GitHub secrets):
#   SRC_DB_URL         read-only connection string (session pooler)
#   SCRATCH_DB_URL     the throwaway Postgres the job starts
#   GPG_PUBLIC_KEY     the owner's public key (armored text)
#   BACKUP_REPO        owner/name of the private backup repository
#   BACKUP_REPO_TOKEN  token that can write only to that repository
# It prints sizes and counts only: never a key, a connection string or any data.

set -euo pipefail

for v in SRC_DB_URL SCRATCH_DB_URL GPG_PUBLIC_KEY BACKUP_REPO BACKUP_REPO_TOKEN; do
  if [ -z "${!v:-}" ]; then
    echo "::error::A required value is missing: ${v}"
    exit 1
  fi
done

STAMP="$(date -u +%Y-%m-%d)"
MONTH="$(date -u +%Y-%m)"
WORK="$(mktemp -d)"
cd "${WORK}"

# ---------------------------------------------------------------- 1. dump
echo "::group::Dump"
pg_dump "${SRC_DB_URL}" --format=custom --schema=public --schema=private \
  --no-owner --no-privileges --file=public.dump
pg_dump "${SRC_DB_URL}" --format=custom --data-only --no-owner \
  --table=auth.users --table=auth.identities --table=auth.mfa_factors --file=auth-data.dump
ls -l public.dump auth-data.dump | awk '{print $5" bytes  "$9}'
echo "::endgroup::"

# ------------------------------------------- 2. prove the dump restores
echo "::group::Restore test in a throwaway database"
psql "${SCRATCH_DB_URL}" -v ON_ERROR_STOP=1 -q <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema if not exists auth;
create schema if not exists extensions;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as 'select null::uuid';
create function auth.jwt() returns jsonb language sql stable as 'select null::jsonb';
create function auth.role() returns text language sql stable as 'select null::text';
SQL

pg_restore --section=pre-data --no-owner --no-privileges -d "${SCRATCH_DB_URL}" public.dump 2> pre.err || true
PGOPTIONS='-c session_replication_role=replica' \
  pg_restore --section=data --no-owner -d "${SCRATCH_DB_URL}" public.dump 2> data.err
pg_restore --section=post-data --no-owner --no-privileges -d "${SCRATCH_DB_URL}" public.dump 2> post.err || true
echo "Restore messages: before-data $(wc -l < pre.err) lines, data $(wc -l < data.err) lines, after-data $(wc -l < post.err) lines (some are expected: this scratch database has no Supabase roles)."

tables="$(psql "${SRC_DB_URL}" -Atc "select schemaname||'.'||tablename from pg_tables where schemaname in ('public','private') order by 1")"
bad=0
: > manifest.txt
echo "Backup ${STAMP} (UTC). Row counts of the database at backup time." >> manifest.txt
for t in ${tables}; do
  a="$(psql "${SRC_DB_URL}" -Atc "select count(*) from ${t}")"
  b="$(psql "${SCRATCH_DB_URL}" -Atc "select count(*) from ${t}" 2>/dev/null || echo "missing")"
  printf '%s\t%s\t%s\n' "${t}" "${a}" "${b}" >> manifest.txt
  if [ "${b}" = "missing" ]; then
    echo "::error::Table ${t} did not restore."
    bad=1
  else
    diff=$(( a > b ? a - b : b - a ))
    allowed=$(( a / 50 > 5 ? a / 50 : 5 ))
    if [ "${b}" -gt "${a}" ] || [ "${diff}" -gt "${allowed}" ]; then
      echo "::error::Table ${t} restored ${b} rows but the source has ${a}."
      bad=1
    fi
  fi
done
echo "Tables checked: $(echo "${tables}" | wc -w). Table, source rows, restored rows:"
cat manifest.txt
if [ "${bad}" -ne 0 ]; then
  echo "::error::The restore test failed, so this backup is NOT stored."
  exit 1
fi
echo "Restore test passed."
echo "::endgroup::"

# ------------------------------------------------------------ 3. encrypt
echo "::group::Encrypt"
export GNUPGHOME
GNUPGHOME="$(mktemp -d)"
chmod 700 "${GNUPGHOME}"
printf '%s\n' "${GPG_PUBLIC_KEY}" | gpg --batch --quiet --import
FPR="$(gpg --batch --list-keys --with-colons | awk -F: '/^fpr/{print $10; exit}')"
if [ -z "${FPR}" ]; then echo "::error::The public key could not be read."; exit 1; fi
for f in public.dump auth-data.dump; do
  gpg --batch --yes --quiet --trust-model always -r "${FPR}" -o "${f}.gpg" --encrypt "${f}"
done
ls -l public.dump.gpg auth-data.dump.gpg | awk '{print $5" bytes  "$9}'
# The plain files are not needed any more.
shred -u public.dump auth-data.dump 2>/dev/null || rm -f public.dump auth-data.dump
echo "::endgroup::"

# ----------------------------------------------- 4. store, keep 14 + 12
echo "::group::Store"
AUTH_B64="$(printf 'x-access-token:%s' "${BACKUP_REPO_TOKEN}" | base64 -w0)"
echo "::add-mask::${AUTH_B64}"
GIT=(git -c "http.https://github.com/.extraheader=AUTHORIZATION: basic ${AUTH_B64}")

REPO_DIR="$(mktemp -d)"
"${GIT[@]}" clone --quiet "https://github.com/${BACKUP_REPO}.git" "${REPO_DIR}" 2>&1 | grep -v "empty repository" || true
if [ ! -d "${REPO_DIR}/.git" ]; then
  echo "::error::Could not open the backup repository. Check BACKUP_REPO_TOKEN and that the repository ${BACKUP_REPO} exists."
  exit 1
fi
cd "${REPO_DIR}"

mkdir -p "daily/${STAMP}"
cp "${WORK}/public.dump.gpg" "${WORK}/auth-data.dump.gpg" "${WORK}/manifest.txt" "daily/${STAMP}/"
if [ ! -d "monthly/${MONTH}" ]; then
  mkdir -p "monthly/${MONTH}"
  cp "daily/${STAMP}/"* "monthly/${MONTH}/"
fi
# Keep the newest 14 daily and 12 monthly folders.
ls -1d daily/* 2>/dev/null | sort | head -n -14 | xargs -r rm -rf
ls -1d monthly/* 2>/dev/null | sort | head -n -12 | xargs -r rm -rf

cat > README.md <<'TXT'
Encrypted database backups for the RSF website. Everything here is encrypted with the
Foundation's public key and can only be opened with its private key (held offline by the owner).
Restore steps: docs/RESTORE.md in the rsf-website repository.
daily/YYYY-MM-DD   one folder for each of the last 14 days
monthly/YYYY-MM    one folder for each of the last 12 months
manifest.txt       table names and row counts only, no data
TXT

git checkout --quiet --orphan "snapshot-${STAMP}" 2>/dev/null || git symbolic-ref HEAD "refs/heads/snapshot-${STAMP}"
git add -A
git -c user.name="RSF backup bot" -c user.email="backup-bot@users.noreply.github.com" \
  commit --quiet -m "Backup ${STAMP}"
"${GIT[@]}" push --quiet --force origin "HEAD:main"
echo "Stored: daily/${STAMP}. Daily folders kept: $(ls -1d daily/* | wc -l). Monthly folders kept: $(ls -1d monthly/* | wc -l)."
echo "::endgroup::"
