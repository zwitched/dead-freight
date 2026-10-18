#!/usr/bin/env bash
# Runs every browser test. Needs: pip install playwright && python -m playwright install chromium
# Each test prints PASS/BAD lines; full logs go to /tmp/df_<test>.log
cd "$(dirname "$0")"
python3 ../build.py >/dev/null
fail=0
for t in test_slice.py test_mechanics.py test_menus.py test_recovery.py test_layout.py test_career.py test_http.py test_perf.py; do
  [ -f "$t" ] || continue
  echo "== $t"; python3 "$t" > "/tmp/df_$t.log" 2>&1 || fail=1
  grep -aE "^(BAD|SUMMARY|ERRORS)" "/tmp/df_$t.log"
done
exit $fail
