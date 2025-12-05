#!/usr/bin/env python3
import csv
import subprocess
import json
from collections import defaultdict
from urllib.parse import urlparse

# Read manual tracking CSV
manual_mentions = []
with open('/Users/jaredhensley/Code/mediamentions/manual-tracking-efi.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

    for i, row in enumerate(rows[4:], start=4):  # Skip header rows
        if not row or not row[0]:
            continue
        if row[0] in ('example', 'JULY') or 'EFI Media Mentions' in str(row[0]) or row[0].startswith('5/12/20'):
            continue

        date = row[0][:10] if len(row[0]) >= 10 else row[0]
        publication = row[1] if len(row) > 1 else ''
        title = row[2] if len(row) > 2 else ''
        link = row[5] if len(row) > 5 else ''

        manual_mentions.append({
            'date': date,
            'publication': publication.strip(),
            'title': title.strip(),
            'link': link.strip()
        })

# Get automated mentions from database
result = subprocess.run([
    'node', '-e',
    """
    const { runQuery } = require('./src/db');
    const clients = runQuery("SELECT id FROM clients WHERE LOWER(name) LIKE '%efi%' OR LOWER(name) LIKE '%equitable%' LIMIT 1");
    if (!clients.length) process.exit(1);
    const mentions = runQuery('SELECT title, link, source, mentionDate, verified FROM mediaMentions WHERE clientId = @p0', [clients[0].id]);
    console.log(JSON.stringify(mentions));
    """
], capture_output=True, text=True, cwd='/Users/jaredhensley/Code/mediamentions')

auto_mentions = json.loads(result.stdout) if result.returncode == 0 else []

print(f"\n{'='*80}")
print("COMPARISON: Manual Tracking vs Automated System")
print(f"{'='*80}\n")

print(f"Manual tracking: {len(manual_mentions)} mentions")
print(f"Automated system: {len(auto_mentions)} total mentions")
print(f"  - Verified: {len([m for m in auto_mentions if m['verified'] == 1])}")
print(f"  - False positives: {len([m for m in auto_mentions if m['verified'] == 0])}")

# Normalize URLs for comparison
def normalize_url(url):
    if not url:
        return ''
    url = url.lower().strip()
    # Remove common URL parameters and fragments
    parsed = urlparse(url)
    return f"{parsed.netloc}{parsed.path}".rstrip('/')

# Build lookup maps
manual_by_url = {}
for m in manual_mentions:
    normalized = normalize_url(m['link'])
    if normalized:
        manual_by_url[normalized] = m

auto_by_url = {}
for m in auto_mentions:
    normalized = normalize_url(m['link'])
    if normalized:
        auto_by_url[normalized] = m

# Find matches
matches = []
for url, manual in manual_by_url.items():
    if url in auto_by_url:
        matches.append((manual, auto_by_url[url]))

print(f"\nMatches found: {len(matches)} mentions in both systems")

# Find what we missed
missed = []
for url, manual in manual_by_url.items():
    if url not in auto_by_url:
        missed.append(manual)

print(f"Missed by automation: {len(missed)} mentions\n")

# Analyze missed mentions
print(f"\n{'='*80}")
print("ANALYSIS OF MISSED MENTIONS")
print(f"{'='*80}\n")

# Group by publication
by_pub = defaultdict(list)
for m in missed:
    by_pub[m['publication']].append(m)

print("Top publications we missed:")
sorted_pubs = sorted(by_pub.items(), key=lambda x: len(x[1]), reverse=True)
for pub, mentions in sorted_pubs[:15]:
    print(f"  {pub}: {len(mentions)} mentions")

# Group by month
by_month = defaultdict(list)
for m in missed:
    try:
        month = m['date'][:7]  # YYYY-MM
        by_month[month].append(m)
    except:
        pass

print(f"\nMissed mentions by month:")
for month in sorted(by_month.keys()):
    print(f"  {month}: {len(by_month[month])} mentions")

# Analyze types of mentions
print(f"\n{'='*80}")
print("PATTERNS IN MISSED MENTIONS")
print(f"{'='*80}\n")

# Categorize by title keywords
direct_mentions = []
certification_mentions = []
farmworker_mentions = []
company_mentions = []
other_mentions = []

for m in missed:
    title_lower = m['title'].lower()
    if 'efi' in title_lower or 'equitable food initiative' in title_lower:
        direct_mentions.append(m)
    elif 'certified' in title_lower or 'certification' in title_lower:
        certification_mentions.append(m)
    elif 'farmworker' in title_lower or 'farm worker' in title_lower:
        farmworker_mentions.append(m)
    elif any(word in title_lower for word in ['stemilt', 'naturesweet', 'windset', 'homegrown']):
        company_mentions.append(m)
    else:
        other_mentions.append(m)

print(f"Direct EFI mentions: {len(direct_mentions)}")
print(f"  Example: {direct_mentions[0]['title'][:80] if direct_mentions else 'N/A'}")
print(f"\nCertification mentions: {len(certification_mentions)}")
print(f"  Example: {certification_mentions[0]['title'][:80] if certification_mentions else 'N/A'}")
print(f"\nFarmworker-related: {len(farmworker_mentions)}")
print(f"  Example: {farmworker_mentions[0]['title'][:80] if farmworker_mentions else 'N/A'}")
print(f"\nCompany/partner mentions: {len(company_mentions)}")
print(f"  Example: {company_mentions[0]['title'][:80] if company_mentions else 'N/A'}")
print(f"\nOther mentions: {len(other_mentions)}")

# Show sample of direct EFI mentions we missed
print(f"\n{'='*80}")
print("SAMPLE OF DIRECT EFI MENTIONS WE MISSED")
print(f"{'='*80}\n")

for i, m in enumerate(direct_mentions[:10], 1):
    print(f"{i}. [{m['date']}] {m['title']}")
    print(f"   Publication: {m['publication']}")
    print(f"   URL: {m['link'][:80]}...")
    print()

# Analyze what we found that they didn't
print(f"\n{'='*80}")
print("MENTIONS WE FOUND THAT MANUAL TRACKING DIDN'T")
print(f"{'='*80}\n")

auto_only = []
for url, auto in auto_by_url.items():
    if url not in manual_by_url and auto['verified'] == 1:
        auto_only.append(auto)

print(f"Found {len(auto_only)} verified mentions not in manual tracking:\n")
for i, m in enumerate(auto_only, 1):
    print(f"{i}. [{m['mentionDate'][:10]}] {m['title']}")
    print(f"   Source: {m['source']}")
    print(f"   URL: {m['link'][:80]}...")
    print()

print(f"\n{'='*80}")
print("KEY INSIGHTS")
print(f"{'='*80}\n")

coverage_rate = (len(matches) / len(manual_mentions) * 100) if manual_mentions else 0
print(f"1. Coverage Rate: {coverage_rate:.1f}% ({len(matches)}/{len(manual_mentions)} mentions)")
print(f"\n2. Our system is missing {len(missed)} mentions ({len(missed)/len(manual_mentions)*100:.1f}%)")
print(f"\n3. Most missed mentions are:")
print(f"   - Direct EFI announcements: {len(direct_mentions)} ({len(direct_mentions)/len(missed)*100:.1f}%)")
print(f"   - Certification/partner companies: {len(certification_mentions) + len(company_mentions)} ({(len(certification_mentions) + len(company_mentions))/len(missed)*100:.1f}%)")
print(f"   - Farmworker-related: {len(farmworker_mentions)} ({len(farmworker_mentions)/len(missed)*100:.1f}%)")
print(f"\n4. Top missing sources:")
for pub, mentions in sorted_pubs[:5]:
    print(f"   - {pub}: {len(mentions)} mentions")

print(f"\n5. Time distribution:")
early_months = sum(len(by_month.get(f'2025-0{i}', [])) for i in range(1, 10))
late_months = sum(len(by_month.get(f'2025-{i}', [])) for i in range(10, 13))
print(f"   - Jan-Sep: {early_months} missed mentions")
print(f"   - Oct-Nov: {late_months} missed mentions")
print(f"   - Most of our verified mentions are from June-Nov 2025")
