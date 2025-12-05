// Common priority publications for produce industry clients
const PRODUCE_PUBLICATIONS = [
  'thepacker.com',
  'andnowuknow.com',
  'theproducenews.com',
  'perishablenews.com',
  'freshplaza.com',
  'bluebookservices.com',
  'producebusiness.com',
  'hortidaily.com',
  'freshfruitportal.com',
  'produceretailer.com'
];

// Priority publications for cattle/beef industry
const CATTLE_PUBLICATIONS = [
  'beefmagazine.com',
  'drovers.com',
  'cattlenetwork.com',
  'agweb.com',
  'progressivecattle.com',
  'americancattlemen.com'
];

// Priority publications for North Dakota news/events
const ND_PUBLICATIONS = [
  'grandforksherald.com',
  'bismarcktribune.com',
  'inforum.com',
  'kfyrtv.com',
  'valleynewslive.com',
  'minotdailynews.com'
];

const clientSearchProfiles = [
  {
    name: 'Bushwick Commission',
    // Dual-query: full name only, no context restrictions
    searchTerms: 'Bushwick Commission',
    contextWords: [],
    excludeWords: ['apartment', 'housing', 'community board', 'residential'],
    ownDomains: ['bushwickcommission.com'],
    priorityPublications: PRODUCE_PUBLICATIONS
  },
  {
    name: 'Full Tilt Marketing',
    // Keep both variants - unique enough
    searchTerms: 'Full Tilt Marketing OR FullTilt Marketing',
    contextWords: [],
    excludeWords: ['poker', 'casino', 'gambling'],
    ownDomains: ['fulltiltmarketing.com'],
    priorityPublications: PRODUCE_PUBLICATIONS
  },
  {
    name: 'Michigan Asparagus Advisory Board',
    // MAAB is unique enough to keep
    searchTerms: 'Michigan Asparagus Advisory Board OR MAAB',
    contextWords: [],
    excludeWords: ['fern', 'recipe', 'cooking'],
    ownDomains: ['michiganasparagus.org'],
    priorityPublications: PRODUCE_PUBLICATIONS
  },
  {
    name: 'North Carolina Sweetpotato Commission',
    // Keep variations - they're specific enough
    searchTerms: 'North Carolina Sweetpotato Commission OR NCSC OR "NC Sweetpotato Commission"',
    contextWords: [],
    excludeWords: ['recipe blog', 'home cooking', 'garden center', 'Pinterest'],
    ownDomains: ['ncsweetpotatoes.com'],
    priorityPublications: PRODUCE_PUBLICATIONS
  },
  {
    name: 'North Dakota 250',
    // State anniversary event - uses ND local news publications
    // Note: Most mentions are PDFs from NewzGroup (unfixable with Google)
    searchTerms: 'North Dakota 250 OR ND250 OR "ND 250"',
    contextWords: [],
    excludeWords: ['agriculture', 'farming', 'potato'],
    ownDomains: ['northdakota250.com'],
    priorityPublications: ND_PUBLICATIONS
  },
  {
    name: 'Todd Greiner Farms',
    // Keep full name and packing variant, TGF is fairly unique
    searchTerms: 'Todd Greiner Farms OR "Todd Greiner Farms Packing"',
    contextWords: [],
    excludeWords: ['recipe', 'garden', 'landscaping', 'Christmas', 'wreath', 'home garden', 'backyard'],
    ownDomains: ['toddgreinerfarms.com'],
    priorityPublications: PRODUCE_PUBLICATIONS
  },
  {
    name: 'South Texas Onion Committee',
    // Keep all variants - product brands are specific
    searchTerms: 'South Texas Onion Committee OR STOC OR "Texas 1015" OR TX1015',
    contextWords: [],
    excludeWords: ['recipe', 'cooking', 'garden', 'plant', 'rings'],
    ownDomains: ['southtexasonions.com', 'tx1015.com'],
    priorityPublications: PRODUCE_PUBLICATIONS
  },
  {
    name: 'Texas Watermelon Association',
    // Removed TWA (conflicts with Trans World Airlines in search results)
    searchTerms: 'Texas Watermelon Association',
    contextWords: [],
    excludeWords: ['recipe', 'seed', 'garden', 'plant'],
    ownDomains: ['texaswatermelons.com'],
    priorityPublications: PRODUCE_PUBLICATIONS
  },
  {
    name: 'Colombia Avocado Board',
    // Removed CAB (too generic - cab, cabinet, etc.)
    // Kept "Colombia Avocado" as specific variant
    searchTerms: 'Colombia Avocado Board OR "Colombia Avocado"',
    contextWords: [],
    excludeWords: ['recipe', 'toast', 'guacamole', 'cooking', 'health'],
    ownDomains: ['avocadoscolombia.com'],
    priorityPublications: PRODUCE_PUBLICATIONS
  },
  {
    name: 'Dakota Angus',
    // Cattle industry - uses cattle/beef publications
    searchTerms: 'Dakota Angus',
    contextWords: [],
    excludeWords: ['recipe', 'restaurant', 'steakhouse', 'burger', 'menu'],
    ownDomains: ['dakotaangusllc.com', 'ndangus.com'],
    priorityPublications: CATTLE_PUBLICATIONS
  },
  {
    name: 'Equitable Food Initiative',
    // Removed EFI abbreviation (conflicts with Electronic Fuel Injection)
    searchTerms: 'Equitable Food Initiative',
    contextWords: [],
    excludeWords: ['recipe', 'cooking', 'donation', 'charity', 'volunteer'],
    ownDomains: ['equitablefood.org'],
    priorityPublications: PRODUCE_PUBLICATIONS
  },
  {
    name: 'G&R Farms',
    // Keep variants - they're specific enough
    searchTerms: 'G&R Farms OR "G and R Farms"',
    contextWords: [],
    excludeWords: ['recipe', 'cooking', 'garden', 'scholarship', 'FFA'],
    ownDomains: ['gfvga.org'],
    priorityPublications: PRODUCE_PUBLICATIONS
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
