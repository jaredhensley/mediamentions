# Before/After Search Query Comparison

**Date:** December 4, 2025
**Analysis Window:** 180 days (June 7 - Dec 4, 2025)

---

## Summary Scorecard

| Metric | Before | After | Change |
|--------|--------|-------|---------|
| **Clients with abbreviations** | 1 | 10 | +900% |
| **Clients with industry-optimized context** | 1 | 12 | +1,100% |
| **Average context words per client** | 5.8 | 11.4 | +97% |
| **Critical fixes applied** | 0 | 2 | Full Tilt, Bushwick |
| **Total query variations** | 12 | ~40 | +233% |
| **API queries per day** | 12 | 12 | **No change** ✓ |

---

## Client-by-Client Comparison

### 1. Equitable Food Initiative (EFI) ⭐

**BEFORE:**
```javascript
{
  name: 'Equitable Food Initiative',
  contextWords: ['certification', 'farmworker', 'labor', 'agriculture', 'food safety', 'sustainability'],
  excludeWords: ['recipe', 'cooking', 'donation', 'charity', 'volunteer'],
}
```

**Generated Query:**
```
"Equitable Food Initiative" (certification OR farmworker OR labor OR agriculture OR "food safety" OR sustainability) -recipe -cooking -donation -charity -volunteer -site:equitablefood.org
```

**Results:** 1 mention found (1.2% coverage - 1/82)

---

**AFTER:**
```javascript
{
  name: 'Equitable Food Initiative',
  searchTerms: 'Equitable Food Initiative OR EFI OR ECIP OR "Ethical Charter Implementation Program"',
  contextWords: ['certification', 'farmworker', 'produce', 'agriculture', 'sustainability', 'initiative', 'program', 'toolkit', 'grant', 'awareness'],
  excludeWords: ['recipe', 'cooking', 'donation', 'charity', 'volunteer'],
}
```

**Generated Query:**
```
"Equitable Food Initiative OR EFI OR ECIP OR "Ethical Charter Implementation Program"" (certification OR farmworker OR produce OR agriculture OR sustainability OR initiative OR program OR toolkit OR grant OR awareness) -recipe -cooking -donation -charity -volunteer -site:equitablefood.org
```

**Expected Results:** ~33 mentions (40% coverage - 33/82)

**Changes:**
- ✅ Added "EFI" abbreviation
- ✅ Added "ECIP" program variant
- ✅ Added "Ethical Charter Implementation Program"
- ✅ Expanded context: produce, initiative, program, toolkit, grant, awareness
- ✅ Removed: labor, "food safety" (too restrictive)

**Impact:** **23x improvement** (1 → 23 in testing), **40% coverage expected**

---

### 2. Full Tilt Marketing 🔴 CRITICAL FIX

**BEFORE:**
```javascript
{
  name: 'Full Tilt Marketing',
  contextWords: ['marketing', 'agency', 'branding', 'communications'],
  excludeWords: ['poker', 'casino', 'game', 'gambling'],
}
```

**Generated Query:**
```
"Full Tilt Marketing" (marketing OR agency OR branding OR communications) -poker -casino -game -gambling -site:fulltiltmarketing.com
```

**Results:** 0 mentions (0% coverage - 0/4)
**Problem:** Wrong industry - treated as general marketing agency instead of produce/agriculture specialist

---

**AFTER:**
```javascript
{
  name: 'Full Tilt Marketing',
  searchTerms: 'Full Tilt Marketing OR FullTilt Marketing',
  contextWords: ['produce', 'vegetable', 'agriculture', 'food', 'farming', 'grower', 'Vegetable of the Year', 'harvest', 'season', 'industry'],
  excludeWords: ['poker', 'casino', 'gambling'],
}
```

**Generated Query:**
```
"Full Tilt Marketing OR FullTilt Marketing" (produce OR vegetable OR agriculture OR food OR farming OR grower OR "Vegetable of the Year" OR harvest OR season OR industry) -poker -casino -gambling -site:fulltiltmarketing.com
```

**Expected Results:** 4 mentions (100% coverage - 4/4)

**Changes:**
- ✅ Added "FullTilt Marketing" spacing variant
- ✅ **COMPLETE industry realignment** - replaced ALL context words
- ✅ Added signature program: "Vegetable of the Year"
- ✅ Removed: game (too broad)
- 🔴 **CRITICAL FIX:** Now searches produce trade publications

**Impact:** **0% → 100% coverage expected** (should find all 4 Broccolini VoY mentions)

---

### 3. Michigan Asparagus Advisory Board (MAAB)

**BEFORE:**
```javascript
{
  name: 'Michigan Asparagus Advisory Board',
  contextWords: ['asparagus', 'produce', 'agriculture', 'farming', 'Michigan', 'vegetable'],
  excludeWords: ['fern', 'plant', 'garden', 'recipe', 'cooking'],
}
```

**AFTER:**
```javascript
{
  name: 'Michigan Asparagus Advisory Board',
  searchTerms: 'Michigan Asparagus Advisory Board OR MAAB',
  contextWords: ['asparagus', 'produce', 'agriculture', 'farming', 'Michigan', 'vegetable', 'harvest', 'grower', 'growers', 'season', 'festival', 'advisory', 'commission'],
  excludeWords: ['fern', 'recipe', 'cooking'],
}
```

**Changes:**
- ✅ Added "MAAB" abbreviation
- ✅ Added: harvest, grower, growers, season, festival, advisory, commission
- ✅ Removed: plant, garden (too restrictive for commercial agriculture)

**Impact:** **30-50% coverage expected** (from 0%)

---

### 4. North Carolina Sweetpotato Commission (NCSC)

**BEFORE:**
```javascript
{
  name: 'North Carolina Sweetpotato Commission',
  contextWords: ['sweetpotato', 'produce', 'agriculture', 'farming', 'grower', 'harvest'],
  excludeWords: ['recipe', 'cooking', 'baking', 'garden', 'plant'],
}
```

**AFTER:**
```javascript
{
  name: 'North Carolina Sweetpotato Commission',
  searchTerms: 'North Carolina Sweetpotato Commission OR NCSC OR "NC Sweetpotato Commission" OR "North Carolina sweet potato Commission"',
  contextWords: ['sweetpotato', 'sweet potato', 'produce', 'agriculture', 'farming', 'grower', 'harvest', 'export', 'trade', 'marketing', 'industry', 'commission', 'research', 'Carolina', 'season'],
  excludeWords: ['recipe blog', 'home cooking', 'garden center', 'Pinterest'],
}
```

**Changes:**
- ✅ Added "NCSC", "NC Sweetpotato Commission" abbreviations
- ✅ Added "sweet potato" (2-word spelling variant)
- ✅ Added: export, trade, marketing, industry, commission, research, Carolina, season
- ✅ Made excludes more specific (phrases instead of single words)

**Impact:** **30-50% coverage expected** (from 0%)

---

### 5. Todd Greiner Farms (TGF)

**BEFORE:**
```javascript
{
  name: 'Todd Greiner Farms',
  contextWords: ['asparagus', 'produce', 'agriculture', 'farming', 'Michigan', 'pumpkin'],
  excludeWords: ['recipe', 'garden', 'landscaping', 'Christmas', 'wreath'],
}
```

**AFTER:**
```javascript
{
  name: 'Todd Greiner Farms',
  searchTerms: 'Todd Greiner Farms OR TGF OR "Todd Greiner Farms Packing"',
  contextWords: ['asparagus', 'produce', 'agriculture', 'farming', 'Michigan', 'pumpkin', 'sweet corn', 'corn', 'Hart', 'vegetables', 'grower', 'packing', 'harvest', 'season'],
  excludeWords: ['recipe', 'garden', 'landscaping', 'Christmas', 'wreath', 'home garden', 'backyard'],
}
```

**Changes:**
- ✅ Added "TGF" abbreviation (found in existing article!)
- ✅ Added "Todd Greiner Farms Packing" (full business name)
- ✅ Added: sweet corn, corn, Hart (location), vegetables, grower, packing, harvest, season
- ✅ Added: home garden, backyard to excludes

**Impact:** **50-75% coverage expected** (from ~10%)

---

### 6. South Texas Onion Committee (STOC)

**BEFORE:**
```javascript
{
  name: 'South Texas Onion Committee',
  contextWords: ['onion', 'produce', 'agriculture', 'farming', 'Texas', '1015'],
  excludeWords: ['recipe', 'cooking', 'garden', 'plant', 'rings'],
}
```

**AFTER:**
```javascript
{
  name: 'South Texas Onion Committee',
  searchTerms: 'South Texas Onion Committee OR STOC OR "Texas 1015" OR TX1015 OR "1015 onion"',
  contextWords: ['onion', 'produce', 'agriculture', 'farming', 'Texas', '1015', 'sweet onion', 'grower', 'harvest', 'marketing order', 'TIPA', 'Viva Fresh', 'industry', 'export', 'season'],
  excludeWords: ['recipe', 'cooking', 'garden', 'plant', 'rings'],
}
```

**Changes:**
- ✅ Added "STOC" abbreviation
- ✅ Added product brand: "Texas 1015", "TX1015", "1015 onion"
- ✅ Added: sweet onion, grower, harvest, marketing order, TIPA, Viva Fresh, industry, export, season

**Impact:** **40-60% coverage expected** (from 0%)

---

### 7. Texas Watermelon Association (TWA)

**BEFORE:**
```javascript
{
  name: 'Texas Watermelon Association',
  contextWords: ['watermelon', 'produce', 'agriculture', 'farming', 'grower', 'Texas'],
  excludeWords: ['recipe', 'seed', 'garden', 'plant', 'summer'],
}
```

**AFTER:**
```javascript
{
  name: 'Texas Watermelon Association',
  searchTerms: 'Texas Watermelon Association OR TWA',
  contextWords: ['watermelon', 'produce', 'agriculture', 'farming', 'grower', 'Texas', 'harvest', 'crop', 'season', 'industry', 'growers', 'melon'],
  excludeWords: ['recipe', 'seed', 'garden', 'plant'],
}
```

**Changes:**
- ✅ Added "TWA" abbreviation
- ✅ Added: harvest, crop, season, industry, growers, melon
- ✅ **Removed "summer" from excludes** - watermelon season is summer!

**Impact:** **30-50% coverage expected** (from 0%)

---

### 8. Bushwick Commission

**BEFORE:**
```javascript
{
  name: 'Bushwick Commission',
  contextWords: ['produce', 'fruit', 'vegetable', 'foodservice'],
  excludeWords: ['apartment', 'housing', 'community', 'board'],
}
```

**AFTER:**
```javascript
{
  name: 'Bushwick Commission',
  contextWords: ['produce', 'fruit', 'vegetable', 'foodservice', 'distributor', 'wholesale', 'fresh', 'supplier', 'delivery', 'retailer', 'grocery', 'market'],
  excludeWords: ['apartment', 'housing', 'community board', 'residential'],
}
```

**Changes:**
- ✅ Added business context: distributor, wholesale, fresh, supplier, delivery, retailer, grocery, market
- ✅ Fixed "board" → "community board" (more specific, won't filter "advisory board")

**Impact:** **50%+ coverage expected** (from 0%, should find 2/2 Produce News mentions)

---

### 9. North Dakota 250 (ND250)

**BEFORE:**
```javascript
{
  name: 'North Dakota 250',
  contextWords: ['anniversary', 'celebration', 'heritage', 'history', 'North Dakota', 'America'],
  excludeWords: ['agriculture', 'farming', 'potato', 'grant', 'funding'],
}
```

**AFTER:**
```javascript
{
  name: 'North Dakota 250',
  searchTerms: 'North Dakota 250 OR ND250 OR "ND 250"',
  contextWords: ['anniversary', 'celebration', 'heritage', 'history', 'North Dakota', 'America', 'statehood', 'logo', 'kickoff', 'event', 'grant', 'mural', 'tourism', 'committee', 'commission', 'volunteer', 'community', 'legacy', '250th'],
  excludeWords: ['agriculture', 'farming', 'potato'],
}
```

**Changes:**
- ✅ Added "ND250", "ND 250" abbreviations
- ✅ Added event terms: statehood, logo, kickoff, event, grant, mural, tourism, volunteer, community, legacy, 250th
- ✅ **Removed "grant" and "funding" from excludes** (20% of mentions contain these!)

**Impact:** **Still 0%** - all mentions are PDF-only (NewzGroup), unfixable with Google Search

---

### 10. Colombia Avocado Board (CAB)

**BEFORE:**
```javascript
{
  name: 'Colombia Avocado Board',
  contextWords: ['avocado', 'produce', 'agriculture', 'export', 'Colombia', 'Hass'],
  excludeWords: ['recipe', 'toast', 'guacamole', 'cooking', 'health'],
}
```

**AFTER:**
```javascript
{
  name: 'Colombia Avocado Board',
  searchTerms: 'Colombia Avocado Board OR CAB OR "Colombia Avocado"',
  contextWords: ['avocado', 'produce', 'agriculture', 'export', 'Colombia', 'Hass', 'trade', 'import', 'industry', 'grower', 'harvest', 'season'],
  excludeWords: ['recipe', 'toast', 'guacamole', 'cooking', 'health'],
}
```

**Changes:**
- ✅ Added "CAB" abbreviation
- ✅ Added "Colombia Avocado" variant
- ✅ Added: trade, import, industry, grower, harvest, season

**Impact:** **Maintain 100%** (already good baseline)

---

### 11. Dakota Angus

**BEFORE:**
```javascript
{
  name: 'Dakota Angus',
  contextWords: ['beef', 'cattle', 'angus', 'ranching', 'livestock', 'agriculture'],
  excludeWords: ['recipe', 'restaurant', 'steakhouse', 'burger', 'menu'],
}
```

**AFTER:**
```javascript
{
  name: 'Dakota Angus',
  contextWords: ['beef', 'cattle', 'angus', 'ranching', 'livestock', 'agriculture', 'bull', 'herd', 'genetics', 'breeding', 'sale', 'auction', 'North Dakota', 'ND', 'seedstock', 'purebred', 'registered'],
  excludeWords: ['recipe', 'restaurant', 'steakhouse', 'burger', 'menu'],
}
```

**Changes:**
- ✅ Added industry terms: bull, herd, genetics, breeding, sale, auction, North Dakota, ND, seedstock, purebred, registered
- ⚠️ No "DA" abbreviation (too generic - conflicts with other uses)

**Impact:** **20-40% coverage expected** (from 0%)

---

### 12. G&R Farms

**BEFORE:**
```javascript
{
  name: 'G&R Farms',
  contextWords: ['Vidalia', 'onion', 'produce', 'agriculture', 'farming', 'Georgia'],
  excludeWords: ['recipe', 'cooking', 'garden', 'scholarship', 'FFA'],
}
```

**AFTER:**
```javascript
{
  name: 'G&R Farms',
  searchTerms: 'G&R Farms OR "G and R Farms" OR "G & R"',
  contextWords: ['Vidalia', 'onion', 'produce', 'agriculture', 'farming', 'Georgia', 'sweet onion', 'grower', 'harvest', 'crop', 'supplier', 'packer', 'shipper', 'season'],
  excludeWords: ['recipe', 'cooking', 'garden', 'scholarship', 'FFA'],
}
```

**Changes:**
- ✅ Added "G and R Farms", "G & R" variations
- ✅ Added: sweet onion, grower, harvest, crop, supplier, packer, shipper, season

**Impact:** **30-50% coverage expected** (from 0%)

---

## Key Improvements Summary

### Abbreviations (9 clients)
- EFI, MAAB, NCSC, TWA, TGF, STOC, ND250, CAB, G&R

### Industry Realignment (1 client)
- Full Tilt Marketing: general marketing → produce specialist

### Context Expansions (All clients)
- Seasonal: harvest, season, crop, grower
- Business: industry, commission, association
- Product-specific: Based on client specialty

### Exclude Word Refinements
- More specific phrases (e.g., "recipe blog" vs "recipe")
- Removed overly restrictive terms (summer, plant, garden)
- Fixed broad terms (board → community board)

---

## Expected Overall Impact

| Outcome | Count | Percentage |
|---------|-------|------------|
| **Dramatic improvement** (>50%) | 3 | 25% (Full Tilt, TGF, STOC) |
| **Significant improvement** (20-50%) | 7 | 58% (MAAB, NCSC, TWA, Bushwick, CAB, Dakota, G&R) |
| **Moderate improvement** (10-20%) | 1 | 8% (EFI) |
| **No improvement possible** | 1 | 8% (ND250 - PDF only) |

**Total clients improved:** 11 of 12 (92%)

---

## Validation Checklist

After next search run, verify:

### High Priority
- [ ] Full Tilt Marketing finds 4 Broccolini mentions
- [ ] EFI finds ~33 mentions (vs 23 in test)
- [ ] TGF finds mentions using "TGF" abbreviation

### Medium Priority
- [ ] MAAB, NCSC, TWA find new mentions via abbreviations
- [ ] STOC finds Texas 1015 product mentions
- [ ] Bushwick finds Produce News company spotlights

### Baseline Monitoring
- [ ] CAB maintains good coverage
- [ ] Dakota Angus finds industry coverage
- [ ] G&R Farms finds mentions
- [ ] ND250 still at 0% (expected - PDF only)

---

**Generated:** December 4, 2025
**Next Update:** After first search run with new queries
