#!/usr/bin/env python3
import csv
from datetime import datetime

# Read manual tracking CSV
manual_mentions = []
with open('/Users/jaredhensley/Code/mediamentions/manual-tracking-efi.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

    for row in rows[4:]:  # Skip header rows
        if not row or not row[0]:
            continue
        if row[0] in ('example', 'JULY') or 'EFI Media Mentions' in str(row[0]) or row[0].startswith('5/12/20'):
            continue

        date_str = row[0][:10] if len(row[0]) >= 10 else row[0]

        try:
            date = datetime.strptime(date_str, '%Y-%m-%d')
        except:
            continue

        publication = row[1] if len(row) > 1 else ''
        title = row[2] if len(row) > 2 else ''
        link = row[5] if len(row) > 5 else ''

        manual_mentions.append({
            'date': date,
            'date_str': date_str,
            'publication': publication.strip(),
            'title': title.strip(),
            'link': link.strip()
        })

# Filter to 180-day window (Jun 7 - Dec 4, 2025)
window_start = datetime(2025, 6, 7)
window_end = datetime(2025, 12, 4)

mentions_in_window = [m for m in manual_mentions if window_start <= m['date'] <= window_end]

print(f"Manual tracking mentions in 180-day window:")
print(f"Window: {window_start.strftime('%b %d, %Y')} to {window_end.strftime('%b %d, %Y')}")
print(f"Total: {len(mentions_in_window)} mentions\n")

# Group by month
from collections import defaultdict
by_month = defaultdict(list)
for m in mentions_in_window:
    month = m['date'].strftime('%Y-%m')
    by_month[month].append(m)

print("Breakdown by month:")
for month in sorted(by_month.keys()):
    print(f"  {month}: {len(by_month[month])} mentions")

print(f"\n{'='*80}")
print(f"COMPARISON (180-day window only)")
print(f"{'='*80}\n")
print(f"Manual tracking: {len(mentions_in_window)} mentions")
print(f"Automated system: 11 verified mentions")
print(f"Overlap: 1 mention")
print(f"\nCoverage rate: {1/len(mentions_in_window)*100:.1f}% (1/{len(mentions_in_window)} mentions)")
print(f"Missed: {len(mentions_in_window)-1} mentions ({(len(mentions_in_window)-1)/len(mentions_in_window)*100:.1f}%)")
print(f"\nAutomated system found 10 unique mentions NOT in manual tracking")
print(f"This suggests both systems have blind spots\n")

# Show samples of what we missed in the 180-day window
print(f"{'='*80}")
print(f"SAMPLE OF MISSED MENTIONS (within 180-day window)")
print(f"{'='*80}\n")

for i, m in enumerate(mentions_in_window[:15], 1):
    print(f"{i}. [{m['date_str']}] {m['title'][:70]}")
    print(f"   Publication: {m['publication']}")
    print()
