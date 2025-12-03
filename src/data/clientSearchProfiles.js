const clientSearchProfiles = [
  {
    name: 'Bushwick Commission',
    contextWords: ['produce', 'fruit', 'vegetable', 'foodservice'],
    excludeWords: ['apartment', 'housing', 'community', 'board'],
    ownDomains: ['bushwickcommission.com']
  },
  {
    name: 'Full Tilt Marketing',
    contextWords: ['marketing', 'agency', 'branding', 'communications'],
    excludeWords: ['poker', 'casino', 'game', 'gambling'],
    ownDomains: ['fulltiltmarketing.com']
  },
  {
    name: 'Michigan Asparagus Advisory Board',
    contextWords: ['asparagus', 'produce', 'agriculture', 'farming', 'Michigan', 'vegetable'],
    excludeWords: ['fern', 'plant', 'garden', 'recipe', 'cooking'],
    ownDomains: ['michiganasparagus.org']
  },
  {
    name: 'North Carolina Sweetpotato Commission',
    contextWords: ['sweetpotato', 'produce', 'agriculture', 'farming', 'grower', 'harvest'],
    excludeWords: ['recipe', 'cooking', 'baking', 'garden', 'plant'],
    ownDomains: ['ncsweetpotatoes.com']
  },
  {
    name: 'North Dakota 250',
    contextWords: ['anniversary', 'celebration', 'heritage', 'history', 'North Dakota', 'America'],
    excludeWords: ['agriculture', 'farming', 'potato', 'grant', 'funding'],
    ownDomains: ['nd.gov']
  },
  {
    name: 'Todd Greiner Farms',
    contextWords: ['asparagus', 'produce', 'agriculture', 'farming', 'Michigan', 'pumpkin'],
    excludeWords: ['recipe', 'garden', 'landscaping', 'Christmas', 'wreath'],
    ownDomains: ['toddgreinerfarms.com']
  },
  {
    name: 'South Texas Onion Committee',
    contextWords: ['onion', 'produce', 'agriculture', 'farming', 'Texas', '1015'],
    excludeWords: ['recipe', 'cooking', 'garden', 'plant', 'rings'],
    ownDomains: ['southtexasonions.com', 'tx1015.com']
  },
  {
    name: 'Texas Watermelon Association',
    contextWords: ['watermelon', 'produce', 'agriculture', 'farming', 'grower', 'Texas'],
    excludeWords: ['recipe', 'seed', 'garden', 'plant', 'summer'],
    ownDomains: ['texaswatermelons.com']
  },
  {
    name: 'Colombia Avocado Board',
    contextWords: ['avocado', 'produce', 'agriculture', 'export', 'Colombia', 'Hass'],
    excludeWords: ['recipe', 'toast', 'guacamole', 'cooking', 'health'],
    ownDomains: ['avocadoscolombia.com']
  },
  {
    name: 'Dakota Angus',
    contextWords: ['beef', 'cattle', 'angus', 'ranching', 'livestock', 'agriculture'],
    excludeWords: ['recipe', 'restaurant', 'steakhouse', 'burger', 'menu'],
    ownDomains: ['dakotaangusllc.com', 'ndangus.com']
  },
  {
    name: 'Equitable Food Initiative',
    contextWords: ['certification', 'farmworker', 'labor', 'agriculture', 'food safety', 'sustainability'],
    excludeWords: ['recipe', 'cooking', 'donation', 'charity', 'volunteer'],
    ownDomains: ['equitablefood.org']
  },
  {
    name: 'G&R Farms',
    contextWords: ['Vidalia', 'onion', 'produce', 'agriculture', 'farming', 'Georgia'],
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
    contextWords: normalizeList(match?.contextWords),
    excludeWords: normalizeList(match?.excludeWords),
    ownDomains: normalizeList(match?.ownDomains)
  };
}

module.exports = {
  clientSearchProfiles,
  getSearchProfile
};
