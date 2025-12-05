const clientSearchProfiles = [
  {
    name: 'Bushwick Commission',
    // Phase 1: Expanded context for business/marketing focus
    contextWords: ['produce', 'fruit', 'vegetable', 'foodservice', 'distributor', 'wholesale', 'fresh', 'supplier', 'delivery', 'retailer', 'grocery', 'market'],
    // Phase 1: Fixed 'board' to 'community board' (more specific)
    excludeWords: ['apartment', 'housing', 'community board', 'residential'],
    ownDomains: ['bushwickcommission.com']
  },
  {
    name: 'Full Tilt Marketing',
    // Phase 1: CRITICAL FIX - Changed from general marketing to produce industry
    searchTerms: 'Full Tilt Marketing OR FullTilt Marketing',
    contextWords: ['produce', 'vegetable', 'agriculture', 'food', 'farming', 'grower', 'Vegetable of the Year', 'harvest', 'season', 'industry'],
    excludeWords: ['poker', 'casino', 'gambling'],
    ownDomains: ['fulltiltmarketing.com']
  },
  {
    name: 'Michigan Asparagus Advisory Board',
    // Phase 1: Added MAAB abbreviation
    searchTerms: 'Michigan Asparagus Advisory Board OR MAAB',
    // Phase 2: Added harvest, grower, season, festival, advisory
    contextWords: ['asparagus', 'produce', 'agriculture', 'farming', 'Michigan', 'vegetable', 'harvest', 'grower', 'growers', 'season', 'festival', 'advisory', 'commission'],
    // Removed 'plant' and 'garden' (too restrictive for commercial agriculture)
    excludeWords: ['fern', 'recipe', 'cooking'],
    ownDomains: ['michiganasparagus.org']
  },
  {
    name: 'North Carolina Sweetpotato Commission',
    // Phase 1: Added NCSC abbreviation + variations
    searchTerms: 'North Carolina Sweetpotato Commission OR NCSC OR "NC Sweetpotato Commission" OR "North Carolina sweet potato Commission"',
    // Phase 2: Added sweet potato (2-word), export, trade, marketing, research
    contextWords: ['sweetpotato', 'sweet potato', 'produce', 'agriculture', 'farming', 'grower', 'harvest', 'export', 'trade', 'marketing', 'industry', 'commission', 'research', 'Carolina', 'season'],
    // Made excludes more specific
    excludeWords: ['recipe blog', 'home cooking', 'garden center', 'Pinterest'],
    ownDomains: ['ncsweetpotatoes.com']
  },
  {
    name: 'North Dakota 250',
    // Phase 1: Added ND250 abbreviation
    searchTerms: 'North Dakota 250 OR ND250 OR "ND 250"',
    // Phase 2: Added event-specific terms: logo, kickoff, mural, tourism, volunteer
    // Removed 'grant' and 'funding' from excludes (20% of mentions contain these)
    contextWords: ['anniversary', 'celebration', 'heritage', 'history', 'North Dakota', 'America', 'statehood', 'logo', 'kickoff', 'event', 'grant', 'mural', 'tourism', 'committee', 'commission', 'volunteer', 'community', 'legacy', '250th'],
    excludeWords: ['agriculture', 'farming', 'potato'],
    ownDomains: ['northdakota250.com']
  },
  {
    name: 'Todd Greiner Farms',
    // Phase 1: Added TGF abbreviation + full business name
    searchTerms: 'Todd Greiner Farms OR TGF OR "Todd Greiner Farms Packing"',
    // Phase 2: Added sweet corn, corn, Hart (location), vegetables, grower, packing, season
    contextWords: ['asparagus', 'produce', 'agriculture', 'farming', 'Michigan', 'pumpkin', 'sweet corn', 'corn', 'Hart', 'vegetables', 'grower', 'packing', 'harvest', 'season'],
    excludeWords: ['recipe', 'garden', 'landscaping', 'Christmas', 'wreath', 'home garden', 'backyard'],
    ownDomains: ['toddgreinerfarms.com']
  },
  {
    name: 'South Texas Onion Committee',
    // Phase 1: Added STOC + product brand variations
    searchTerms: 'South Texas Onion Committee OR STOC OR "Texas 1015" OR TX1015 OR "1015 onion"',
    // Phase 2: Added sweet onion, grower, marketing order, TIPA, Viva Fresh, export, season
    contextWords: ['onion', 'produce', 'agriculture', 'farming', 'Texas', '1015', 'sweet onion', 'grower', 'harvest', 'marketing order', 'TIPA', 'Viva Fresh', 'industry', 'export', 'season'],
    excludeWords: ['recipe', 'cooking', 'garden', 'plant', 'rings'],
    ownDomains: ['southtexasonions.com', 'tx1015.com']
  },
  {
    name: 'Texas Watermelon Association',
    // Phase 1: Added TWA abbreviation
    searchTerms: 'Texas Watermelon Association OR TWA',
    // Phase 2: Added harvest, crop, season, industry, melon
    // Removed 'summer' from excludes (too restrictive for watermelon coverage)
    contextWords: ['watermelon', 'produce', 'agriculture', 'farming', 'grower', 'Texas', 'harvest', 'crop', 'season', 'industry', 'growers', 'melon'],
    excludeWords: ['recipe', 'seed', 'garden', 'plant'],
    ownDomains: ['texaswatermelons.com']
  },
  {
    name: 'Colombia Avocado Board',
    // Phase 1: Added CAB abbreviation
    searchTerms: 'Colombia Avocado Board OR CAB OR "Colombia Avocado"',
    // Phase 2: Added trade, import, industry, grower, season
    contextWords: ['avocado', 'produce', 'agriculture', 'export', 'Colombia', 'Hass', 'trade', 'import', 'industry', 'grower', 'harvest', 'season'],
    excludeWords: ['recipe', 'toast', 'guacamole', 'cooking', 'health'],
    ownDomains: ['avocadoscolombia.com']
  },
  {
    name: 'Dakota Angus',
    // Phase 2: Added industry terms: bull, herd, genetics, breeding, sale, auction, North Dakota
    contextWords: ['beef', 'cattle', 'angus', 'ranching', 'livestock', 'agriculture', 'bull', 'herd', 'genetics', 'breeding', 'sale', 'auction', 'North Dakota', 'ND', 'seedstock', 'purebred', 'registered'],
    excludeWords: ['recipe', 'restaurant', 'steakhouse', 'burger', 'menu'],
    ownDomains: ['dakotaangusllc.com', 'ndangus.com']
  },
  {
    name: 'Equitable Food Initiative',
    // Dual-query approach: general search + site-restricted to priority publications
    // Note: "EFI" abbreviation excluded from general query to avoid noise (Electronic Fuel Injection, etc.)
    searchTerms: 'Equitable Food Initiative',
    contextWords: [],
    excludeWords: ['recipe', 'cooking', 'donation', 'charity', 'volunteer'],
    ownDomains: ['equitablefood.org'],
    // Priority publications for site-restricted secondary query
    priorityPublications: [
      'thepacker.com',
      'andnowuknow.com',
      'theproducenews.com',
      'perishablenews.com',
      'freshplaza.com',
      'bluebookservices.com',
      'producebusiness.com',
      'hortidaily.com',
      'freshfruitportal.com'
    ]
  },
  {
    name: 'G&R Farms',
    // Phase 1: Added G&R abbreviation + variations
    searchTerms: 'G&R Farms OR "G and R Farms" OR "G & R"',
    // Phase 2: Added sweet onion, grower, harvest, crop, supplier, packer, shipper, season
    contextWords: ['Vidalia', 'onion', 'produce', 'agriculture', 'farming', 'Georgia', 'sweet onion', 'grower', 'harvest', 'crop', 'supplier', 'packer', 'shipper', 'season'],
    excludeWords: ['recipe', 'cooking', 'garden', 'scholarship', 'FFA'],
    ownDomains: ['gfvga.org']
  }
];

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function getSearchProfile(client) {
  const match = clientSearchProfiles.find((entry) =>
    entry.name.toLowerCase() === client.name.toLowerCase()
  );

  return {
    name: client.name,
    searchTerms: match?.searchTerms || null,
    contextWords: normalizeList(match?.contextWords),
    excludeWords: normalizeList(match?.excludeWords),
    ownDomains: normalizeList(match?.ownDomains),
    priorityPublications: normalizeList(match?.priorityPublications)
  };
}

module.exports = {
  clientSearchProfiles,
  getSearchProfile
};
