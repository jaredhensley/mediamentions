const { randomUUID } = require('crypto');

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildClient(name, keywords = []) {
  const cleanKeywords = keywords.length ? keywords : name.split(/\s+/);
  return {
    id: randomUUID(),
    name,
    domain: `${slugify(name)}.example.com`,
    keywords: cleanKeywords
  };
}

function addClient(name, keywords = []) {
  const client = buildClient(name, keywords);
  clients.push(client);
  return client;
}

const clients = [
  buildClient('Bushwick Commission', ['Bushwick Commission', 'Bushwick']),
  buildClient('Colombia Avocado Board', ['Colombia Avocado Board', 'CAB', 'Avocado']),
  buildClient('Dakota Angus', ['Dakota Angus', 'Dakota', 'Angus']),
  buildClient('Equitable Food Initiative', ['Equitable Food Initiative', 'EFI']),
  buildClient('Full Tilt Marketing', ['Full Tilt Marketing', 'FTM']),
  buildClient('G&R Farms', ['G&R Farms', 'GR Farms', 'G and R Farms']),
  buildClient('Michigan Asparagus Advisory Board', ['Michigan Asparagus Advisory Board', 'MAAB', 'Michigan Asparagus']),
  buildClient('North Carolina Sweetpotato Commission', [
    'North Carolina Sweetpotato Commission',
    'NCSC',
    'Sweetpotato'
  ]),
  buildClient('North Dakota 250', ['North Dakota 250', 'ND250']),
  buildClient('Todd Greiner Farms', ['Todd Greiner Farms', 'Todd Greiner']),
  buildClient('South Texas Onion Committee', ['South Texas Onion Committee', 'STOC', 'Onion']),
  buildClient('Texas Watermelon Association', ['Texas Watermelon Association', 'TWA', 'Watermelon'])
];

const pressReleases = clients.map((client) => ({
  id: randomUUID(),
  clientId: client.id,
  title: `${client.name} latest updates`,
  keywords: [client.name],
  active: true
}));

const mediaMentions = [];
const searchJobs = [];
const publications = {};

module.exports = {
  clients,
  pressReleases,
  mediaMentions,
  searchJobs,
  publications,
  addClient
};
