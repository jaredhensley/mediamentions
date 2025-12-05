# EFI Media Mentions: Automated System Improvement Plan

## Executive Summary

**Current Performance:**
- Manual tracking: 170 mentions (Jan-Nov 2025)
- Automated system: 11 verified mentions
- **Coverage rate: 0.6%** (only 1 matching mention)
- **Missing: 95.3% of mentions** (162 mentions)

**Root Cause:** Overly restrictive search queries that miss most legitimate EFI coverage.

---

## Detailed Analysis

### What We're Missing

**By Type:**
- **Direct EFI announcements: 75 mentions (46.3%)** - Press releases, initiatives, milestones
- **Company/certification mentions: 14 mentions (8.6%)** - EFI-certified companies
- **Farmworker-related: 14 mentions (8.6%)** - Awards, awareness campaigns
- **Other coverage: 59 mentions (36.5%)** - Partnerships, impact stories, industry news

**Top Missing Publications:**
1. And Now U Know (ANUK): 27 mentions
2. The Packer: 25 mentions
3. Perishable News: 20 mentions
4. The Produce News: 17 mentions
5. Fresh Plaza: 12 mentions

**Time Distribution:**
- Jan-Sep 2025: 148 missed mentions (91%)
- Oct-Nov 2025: 14 missed mentions (9%)
- Our system only found mentions from June-Nov 2025

---

## Root Cause: Search Query Issues

### Current Search Query
```
"Equitable Food Initiative" (certification OR farmworker OR labor OR agriculture OR "food safety" OR sustainability) -recipe -cooking -donation -charity -volunteer -site:equitablefood.org
```

### Problems with Current Approach

**1. Requires Full Name Only**
- Query requires exact phrase "Equitable Food Initiative"
- Most trade publications use "EFI" as abbreviation
- Result: Missing ~50% of direct mentions

**Example missed headlines:**
- "EFI celebrates another year of progress" (Fruitnet, Jan 7)
- "EFI highlights 2024 achievements" (The Packer, Jan 7)
- "EFI Awarded 1.2M Walmart Foundation Grant" (ANUK, Feb 25)
- "EFI Marks 10 year anniversary" (The Packer, Apr 8)

**2. Overly Restrictive Context Words**
- Requires one of: certification, farmworker, labor, agriculture, "food safety", sustainability
- Many legitimate announcements don't contain these words
- Articles about grants, toolkits, partnerships, anniversaries are missed

**Example missed types:**
- Grant announcements: "EFI Awarded 1.2M Walmart Foundation Grant"
- Toolkit launches: "EFI Releases new farmworker toolkit"
- Milestone celebrations: "EFI Marks 10 year anniversary"
- Platform updates: "EFI Streamlines Certifications system"
- Educational initiatives: "EFI Expands 2025 Online Learning Opportunities"

**3. Excludes Own Domain**
- `-site:equitablefood.org` filters out all official announcements
- Many trade publications link to or republish official press releases
- Missing the source of truth for announcements

**4. Missing Key Industry Publications**
- Not targeting specific high-value sources
- ANUK, The Packer, Produce News, Fresh Plaza are primary industry sources
- These publications consistently cover EFI but aren't prioritized

---

## Recommended Improvements

### Priority 1: Expand Search Terms (CRITICAL)

**Add "EFI" as search term**
Create additional search queries:
1. Current query (keep for comprehensive coverage)
2. `"EFI" (certification OR farmworker OR produce OR agriculture)`
3. `EFI "Equitable Food" (announcement OR grant OR program OR initiative)`

**Reasoning:**
- 75 direct EFI mentions were missed
- "EFI" is the standard abbreviation in trade publications
- This alone could recover 40-50% of missed mentions

### Priority 2: Add Topic-Specific Searches

**Create targeted queries for known EFI programs:**

1. **Farmworker of the Year:**
   - `("Farmworker of the Year" OR "Farmworker Awareness Week") EFI`
   - 14 missed mentions related to this program

2. **Certification Program:**
   - `"EFI certified" OR "EFI certification" (produce OR agriculture OR farm)`
   - Catches companies announcing their certification

3. **Major Initiatives:**
   - `EFI (grant OR toolkit OR platform OR streamline OR expands) agriculture`
   - Covers toolkits, platform updates, grant announcements

4. **Partnership/Impact:**
   - `"Equitable Food Initiative" (partnership OR collaboration OR impact OR celebrates)`
   - Anniversary celebrations, partnerships, impact stories

### Priority 3: Source-Specific Searches

**Target high-value publications directly:**

Create site-specific searches for top publishers:
- `site:andnowuknow.com "EFI" OR "Equitable Food Initiative"`
- `site:thepacker.com "EFI" OR "Equitable Food Initiative"`
- `site:theproducenews.com "EFI" OR "Equitable Food Initiative"`
- `site:perishablenews.com "EFI" OR "Equitable Food Initiative"`
- `site:freshplaza.com "EFI" OR "Equitable Food Initiative"`

**Benefits:**
- These 5 sources account for 101 missed mentions (62% of total)
- High signal-to-noise ratio (industry-specific publications)
- More likely to be verified as real mentions

### Priority 4: Include Own Domain for Press Releases

**Remove `-site:equitablefood.org` restriction OR create dedicated search:**
- `site:equitablefood.org (press OR news OR announcement)`

**Reasoning:**
- Official announcements are 100% relevant
- Trade publications often republish these
- Missing the original source means missing context

### Priority 5: Relax Context Word Requirements

**Option A: Make context words optional** (less restrictive)
- Use context words for ranking, not filtering
- Let verification AI determine relevance

**Option B: Expand context words** to include:
- Current: certification, farmworker, labor, agriculture, "food safety", sustainability
- Add: produce, grower, harvest, organic, workforce, training, partnership, impact, grant, award, toolkit, program, initiative, announcement, certified

### Priority 6: Historical Coverage

**Add date range searches for early 2025:**
Since we only have mentions from June-Nov 2025, run one-time historical searches:
- Jan-Mar 2025: Major announcements period (18+9+27=54 mentions)
- Apr-May 2025: Farmworker Awareness Week, anniversary coverage (13+11=24 mentions)

Use Google's `after:` and `before:` parameters:
- `"EFI" OR "Equitable Food Initiative" after:2025-01-01 before:2025-06-01`

---

## Implementation Priorities

### Phase 1: Quick Wins (Immediate - 1 week)

1. **Add "EFI" search term** - Could recover 40-50% of mentions
2. **Add site-specific searches** for top 5 publications
3. **Remove own domain exclusion** or add dedicated press release search

**Expected improvement:** 50-60% coverage rate

### Phase 2: Program-Specific (Week 2)

1. Implement Farmworker of the Year searches
2. Add certification-specific queries
3. Add toolkit/initiative searches

**Expected improvement:** 70-80% coverage rate

### Phase 3: Historical Backfill (Week 3)

1. Run one-time searches for Jan-May 2025
2. Verify and add historical mentions
3. Establish baseline for comparison

**Expected improvement:** Full historical coverage

### Phase 4: Ongoing Optimization (Month 2+)

1. Monitor false positive rates
2. Refine context words based on verification results
3. Add new sources as they appear
4. Adjust exclusion words if needed

---

## Updated Search Configuration

### Recommended clientSearchProfiles.js Update

```javascript
{
  name: 'Equitable Food Initiative',
  // Expanded context words - more inclusive
  contextWords: [
    'certification', 'farmworker', 'labor', 'agriculture', 'food safety', 'sustainability',
    'produce', 'grower', 'workforce', 'certified', 'program', 'initiative', 'grant', 'toolkit'
  ],
  // Keep current exclusions
  excludeWords: ['recipe', 'cooking', 'donation', 'charity', 'volunteer'],
  // DON'T exclude own domain
  ownDomains: []  // Remove equitablefood.org exclusion
}
```

### Additional Search Queries to Implement

Modify `searchService.js` to support multiple base queries per client:

```javascript
function buildQueriesForEFI(client, profile, activePressReleases) {
  const searches = [
    // Base query with full name
    buildSearchRequest(client, profile),

    // EFI abbreviation query
    buildSearchRequest(
      { ...client, name: 'EFI' },
      { ...profile, contextWords: ['certification', 'farmworker', 'produce', 'agriculture'] }
    ),

    // Source-specific queries
    { query: 'site:andnowuknow.com "EFI" OR "Equitable Food Initiative"', exactTerms: 'EFI' },
    { query: 'site:thepacker.com "EFI" OR "Equitable Food Initiative"', exactTerms: 'EFI' },
    { query: 'site:theproducenews.com "EFI" OR "Equitable Food Initiative"', exactTerms: 'EFI' },
    { query: 'site:perishablenews.com "EFI" OR "Equitable Food Initiative"', exactTerms: 'EFI' },
    { query: 'site:freshplaza.com "EFI" OR "Equitable Food Initiative"', exactTerms: 'EFI' },

    // Topic-specific queries
    { query: '("Farmworker of the Year" OR "Farmworker Awareness Week") (EFI OR "Equitable Food")', exactTerms: 'Farmworker' },
    { query: '"EFI certified" OR "EFI certification" (produce OR agriculture OR farm)', exactTerms: 'certified' },

    // Press release queries
    ...perRelease
  ];

  return searches;
}
```

---

## Expected Outcomes

### After Phase 1 (Week 1)
- Coverage: 50-60% (85-102 mentions)
- Focus on current coverage (June-Nov)
- Reduced manual tracking burden

### After Phase 2 (Week 2)
- Coverage: 70-80% (119-136 mentions)
- Program-specific coverage improved
- Better certification tracking

### After Phase 3 (Week 3)
- Coverage: 90%+ (153+ mentions)
- Historical gaps filled
- Comprehensive baseline established

### Long-term (3+ months)
- Coverage: 95%+ maintained
- False positive rate < 10%
- Manual tracking only for edge cases
- Automated system as source of truth

---

## Success Metrics

**Coverage Metrics:**
- Track mentions found by automated system vs manual tracking
- Target: 95%+ coverage rate
- Monitor by publication source

**Quality Metrics:**
- Verification rate (target: > 80%)
- False positive rate (target: < 10%)
- Time from publication to detection (target: < 24 hours)

**Efficiency Metrics:**
- Reduction in manual tracking time
- Number of sources covered
- Mention detection latency

---

## Risk Mitigation

**Risk:** Too many false positives from broader searches
**Mitigation:**
- Verification AI already in place
- Monitor false positive rate weekly
- Adjust context words if rate exceeds 15%

**Risk:** API rate limits with more searches
**Mitigation:**
- Google allows 100 results per query, 10 queries per search
- Batch searches efficiently
- Consider upgrading API tier if needed

**Risk:** Missing edge cases/new topics
**Mitigation:**
- Monthly review of manual tracking spreadsheet
- Continuous refinement of search terms
- Add new topics as EFI programs evolve

---

## Validation Plan

**Week 1:**
- Implement Phase 1 changes
- Run search for past 7 days
- Compare results to manual tracking
- Measure coverage improvement

**Week 2:**
- Review false positive rate
- Implement Phase 2 if FP rate < 15%
- Otherwise, refine Phase 1 queries

**Week 3:**
- Historical backfill
- Full comparison with manual tracking YTD
- Present findings to stakeholders

---

## Next Steps

1. **Immediate:** Update `clientSearchProfiles.js` for EFI (remove domain exclusion, expand context words)
2. **Day 2:** Add "EFI" abbreviation search
3. **Day 3:** Add site-specific searches for top 5 publications
4. **Day 4:** Test and validate on past week
5. **Day 5:** Monitor false positive rate
6. **Week 2:** Implement program-specific searches
7. **Week 3:** Historical backfill
8. **Week 4:** Full validation and reporting

---

## Questions for Stakeholder

1. **Priority:** Should we focus on current coverage first, or backfill historical mentions?
2. **False Positives:** What is acceptable false positive rate? (Currently <10%)
3. **Sources:** Are there other industry publications we should prioritize?
4. **Topics:** Are there upcoming EFI initiatives we should add specific searches for?
5. **Verification:** Should certain sources (e.g., official press releases) auto-verify?

---

**Generated:** December 4, 2025
**Author:** Automated System Analysis
**Status:** Ready for implementation
