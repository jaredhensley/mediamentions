import csv
from collections import defaultdict
from datetime import datetime

csv_file = '/Users/jaredhensley/Code/mediamentions/manual-tracking-efi.csv'

with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

# Skip header rows (first 4 rows are headers/examples)
data_rows = []
for row in rows[4:]:
    if not row or not row[0]:
        continue
    if row[0] == 'example' or 'EFI Media Mentions' in str(row[0]):
        continue
    data_rows.append(row)

print(f'Total manually tracked mentions: {len(data_rows)}')
print()

# Count by month
by_month = defaultdict(int)
for row in data_rows:
    date_str = str(row[0])
    if date_str and date_str != '':
        try:
            month = date_str[:7]  # YYYY-MM
            by_month[month] += 1
        except:
            pass

print('Mentions by month:')
for month in sorted(by_month.keys()):
    print(f'  {month}: {by_month[month]}')

print()
print('All manually tracked mentions:')
print('='*80)
for i, row in enumerate(data_rows, 1):
    date = row[0][:10] if len(row) > 0 and row[0] else 'N/A'
    pub = row[1] if len(row) > 1 else 'N/A'
    title = row[2] if len(row) > 2 else 'N/A'
    link = row[5] if len(row) > 5 else 'N/A'
    print(f'{i}. [{date}] {title}')
    print(f'   Publication: {pub}')
    print(f'   Link: {link[:100]}...' if len(link) > 100 else f'   Link: {link}')
    print()
