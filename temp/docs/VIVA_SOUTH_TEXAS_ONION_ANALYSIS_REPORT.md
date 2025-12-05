# South Texas Onion Committee / Viva Client Analysis Report

**Analysis Date:** December 4, 2025
**Analysis Period:** June 7, 2025 - December 4, 2025 (180 days)
**Database Client ID:** 11 (South Texas Onion Committee)

---

## 1. CLIENT IDENTIFICATION: Viva vs South Texas Onion Committee

### Finding: SEPARATE ENTITIES WITH STRATEGIC RELATIONSHIP

**Viva Fresh** and **South Texas Onion Committee** are distinct organizations with a close working relationship:

#### Viva Fresh / TIPA
- **Organization:** Texas International Produce Association (TIPA)
- **Type:** Industry trade association and expo organizer
- **Founded:** TIPA established in 1942; Viva Fresh Expo launched in 2015
- **Mission:** Promotes ~$10 billion in fresh produce grown in Texas or distributed through Texas
- **Event:** Hosts annual Viva Fresh Produce Expo in Houston (10th anniversary in April 2025)

#### South Texas Onion Committee (STOC)
- **Organization:** Federal Marketing Order #959 South Texas Onions
- **Founded:** 1961
- **Product:** Texas 1015 Sweet Onions
- **Type:** Agricultural marketing organization for South Texas onion growers

#### Relationship
- **Shared Leadership:** Dante Galeazzi serves as both STOC Manager and TIPA CEO/President
- **Marketing Platform:** STOC uses Viva Fresh Expo as a key promotional venue
  - Hosts virtual field tours at Viva Fresh
  - Kicks off TX1015 onion season at the expo
- **Strategic Alliance:** Viva Fresh serves as the primary marketing platform for STOC's Texas 1015 onion brand

### Conclusion
**Viva Fresh should be tracked as a SEPARATE client** if TIPA/Viva Fresh itself is a client. However, the Excel "Viva" tab appears to be for tracking Viva Fresh as an organization, not South Texas Onion Committee.

---

## 2. MANUAL TRACKING COUNT (180-day window: June 7 - Dec 4, 2025)

### Viva Fresh Tab Analysis

**Result: 0 mentions in 180-day window**

#### Details:
- Excel File: `/Users/jaredhensley/Downloads/Media Mentions - All Clients (1).xlsx`
- Tab Name: "Viva"
- Total Rows: 4 rows (including headers)
- Actual Data: **ZERO** - The sheet contains only:
  - Row 1: Title header "Viva Fresh Media Mentions 2026"
  - Row 2: Column headers (Date, Publication Name, Title, Topic, Additional Mentions, Link)
  - Row 3-4: Template/example rows with 2026 dates

**Finding:** The Viva tab is a **template for 2026 tracking** and contains no actual 2025 data.

### South Texas Onion Committee in Other Sheets

**Cross-sheet search conducted** for keywords: "onion", "texas", "south texas", "1015", "tx1015"

**Result:** Zero mentions found across all 12 client sheets in the 2025 tracking period.

Only matches found were:
- 4 cells in "EFI" sheet mentioning "Texas" (June 25, 2025) related to tomato trade, not onions

---

## 3. AUTOMATED SYSTEM COUNT (Database)

### Database Query Results

**Result: 0 mentions**

#### Query Details:
- Client ID: 11 (South Texas Onion Committee)
- Table: `mediaMentions`
- Date Range: June 7, 2025 - December 4, 2025
- Result: **ZERO records found**

#### Additional Database Investigation:
- Searched for "Viva" in all database tables: **0 results**
- Searched for "Viva" in client names: **0 matches**
- Total mentions across all clients in database: **5 mentions** (other clients)
  - Colombia Avocado Board: 2 mentions
  - Bushwick Commission: 1 mention
  - Equitable Food Initiative: 1 mention
  - Todd Greiner Farms: 1 mention
  - **South Texas Onion Committee: 0 mentions**

### Database Status
The automated search system appears to be operational but has **not captured any mentions** for South Texas Onion Committee (client ID 11) in any time period queried.

---

## 4. COVERAGE RATE ANALYSIS

### Calculation

```
Manual Tracking Count:  0 mentions
Automated System Count: 0 mentions
Coverage Rate:          N/A (no baseline data to compare)
```

### Status: **INCONCLUSIVE - NO DATA AVAILABLE**

#### Critical Issue Identified:
- **No manual tracking data** exists for South Texas Onion Committee in the 180-day window
- **No automated mentions** captured by the system
- The "Viva" Excel tab is empty (template only)

This suggests one of several possibilities:
1. **South Texas Onion Committee had zero media coverage** during this period (unlikely for an agricultural marketing organization)
2. **Manual tracking has not been performed** for this client in 2025
3. **Viva Fresh is being tracked separately** from South Texas Onion Committee
4. **The search system is not configured** to run for this client yet

---

## 5. PATTERNS IN MISSED MENTIONS

### Analysis Status: **CANNOT BE PERFORMED**

Without baseline manual tracking data, it's impossible to identify patterns in missed mentions.

### However: Potential Issues with Current Search Configuration

Based on the current search profile, here are **potential gaps** that could cause mentions to be missed:

#### Current Search Profile:
```javascript
{
  name: 'South Texas Onion Committee',
  contextWords: ['onion', 'produce', 'agriculture', 'farming', 'Texas', '1015'],
  excludeWords: ['recipe', 'cooking', 'garden', 'plant', 'rings'],
  ownDomains: ['southtexasonions.com', 'tx1015.com']
}
```

#### Identified Potential Gaps:

1. **Brand Name Variations Not Covered:**
   - "STOC" (common abbreviation)
   - "South Texas Onion Committee" vs "South Texas Onions"
   - "TX1015" (brand abbreviation)
   - "Texas 1015 Sweet Onion" (full product name)
   - "1015 onion" (casual reference)

2. **Viva Fresh Association:**
   - Articles about "Viva Fresh Expo" may mention STOC without using full name
   - "Texas produce" at Viva Fresh
   - Virtual field tours (specific event type)

3. **Industry Terminology:**
   - "Federal Marketing Order 959"
   - "Texas onion industry"
   - "South Texas growers"
   - "onion harvest" + Texas
   - "sweet onion" varieties

4. **Leadership Mentions:**
   - "Dante Galeazzi" (Manager of STOC)
   - May appear in articles without explicit STOC mention

5. **Related Organizations:**
   - TIPA (Texas International Produce Association) mentions
   - "Texas produce industry" coverage

6. **Seasonal/Event Coverage:**
   - Harvest season announcements (typically March-June)
   - Viva Fresh Expo coverage (April)
   - Trade show participation
   - Industry conferences

---

## 6. RECOMMENDED SEARCH QUERY IMPROVEMENTS

### Priority 1: Expand Brand Name Variations

**Add Custom Search Terms:**
```javascript
searchTerms: '"South Texas Onion Committee" OR STOC OR "Texas 1015" OR TX1015 OR "1015 onion"'
```

This creates an OR query to catch all common name variations.

### Priority 2: Add Missing Context Words

**Update contextWords:**
```javascript
contextWords: [
  'onion', 'produce', 'agriculture', 'farming', 'Texas', '1015',
  // ADD:
  'sweet onion', 'grower', 'harvest', 'marketing order',
  'TIPA', 'Viva Fresh', 'onion industry', 'export'
]
```

### Priority 3: Refine Exclude Words

**Current excludeWords may be too aggressive:**
```javascript
excludeWords: ['recipe', 'cooking', 'garden', 'plant', 'rings']
```

**Issue:** Excluding "plant" and "garden" is good, but some legitimate articles may mention these in passing.

**Recommendation:** Keep current excludes but monitor for false negatives.

### Priority 4: Add Extra Search Phrases

**Create specific search variations:**
```javascript
extraPhrases: [
  'Dante Galeazzi',
  'Federal Marketing Order 959',
  'South Texas onion growers',
  'Viva Fresh onion'
]
```

### Priority 5: Consider Event-Based Searches

**Seasonal/Event Queries:**
- Q1-Q2: "Texas onion harvest" + year
- April: "Viva Fresh Expo" + "onion" or "South Texas"
- Year-round: "Texas 1015" + "season" or "availability"

---

## RECOMMENDED UPDATED SEARCH PROFILE

```javascript
{
  name: 'South Texas Onion Committee',
  searchTerms: '"South Texas Onion Committee" OR STOC OR "Texas 1015" OR TX1015 OR "1015 onion"',
  contextWords: [
    'onion', 'produce', 'agriculture', 'farming', 'Texas', '1015',
    'sweet onion', 'grower', 'harvest', 'marketing order',
    'TIPA', 'Viva Fresh', 'industry', 'export', 'season'
  ],
  excludeWords: [
    'recipe', 'cooking', 'garden', 'plant', 'rings',
    'apartment', 'housing'  // If "South Texas" triggers unrelated results
  ],
  ownDomains: ['southtexasonions.com', 'tx1015.com']
}
```

---

## NEXT STEPS & RECOMMENDATIONS

### Immediate Actions:

1. **Clarify Client Relationship:**
   - Determine if "Viva Fresh" (TIPA) is a separate client requiring its own tracking
   - Confirm whether STOC mentions at Viva Fresh events should be tracked under STOC

2. **Establish Manual Tracking Baseline:**
   - Manually search for STOC mentions June 7 - Dec 4, 2025 to establish baseline
   - Populate Excel tracking sheet with historical data
   - This is **critical** to measure automated system performance

3. **Update Search Configuration:**
   - Implement the recommended search profile above
   - Test search queries manually to verify coverage

4. **Run Initial Search:**
   - Execute automated search with new configuration
   - Review results for relevance and false positives
   - Adjust excludeWords if needed

5. **Monitor Key Events:**
   - Viva Fresh Expo (annual, April)
   - Onion harvest season (March-June)
   - Industry publications: The Packer, Produce News, Fresh Plaza

### Long-term Monitoring:

- **Monthly Review:** Check for mentions during peak season (Q1-Q2)
- **Event Coverage:** Special attention during Viva Fresh Expo
- **Publication Patterns:** Track which outlets cover STOC most frequently
- **Seasonal Adjustments:** Increase search frequency during harvest season

---

## SOURCES

1. [About Us | Viva Fresh Expo](https://vivafreshexpo.com/about-us/)
2. [Home - Texas International Produce Association](https://texipa.org/)
3. [Texas 1015 onion gets the spotlight at Viva Fresh | Produce News](https://theproducenews.com/onions/texas-1015-onion-gets-spotlight-viva-fresh)
4. [About STOC - Texas 1015 Sweet Onions](https://tx1015.com/about-stoc/)
5. [TIPA celebrates 10th Viva Fresh anniversary | Produce News](https://theproducenews.com/viva-fresh-expo/tipa-celebrates-10th-viva-fresh-anniversary)
6. [Bret Erickson | Agricultural Marketing Service](https://www.ams.usda.gov/content/bret-erickson)

---

## APPENDIX: Technical Details

### Database Schema
- **Table:** `mediaMentions`
- **Key Fields:** `clientId`, `mentionDate`, `title`, `source`, `link`
- **Client Record:** ID 11, name "South Texas Onion Committee"

### Search Configuration File
- **Location:** `/Users/jaredhensley/Code/mediamentions/src/data/clientSearchProfiles.js`
- **Function:** `getSearchProfile(client)` retrieves search parameters

### Query Logic
- **File:** `/Users/jaredhensley/Code/mediamentions/src/utils/searchQueries.js`
- **Function:** `buildSearchRequest(client, profile, options)`
- **Behavior:** Uses `searchTerms` if provided, otherwise uses `client.name`

---

**End of Report**
