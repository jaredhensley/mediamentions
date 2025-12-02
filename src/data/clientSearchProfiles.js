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
