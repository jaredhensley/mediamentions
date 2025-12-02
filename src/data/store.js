const { randomUUID } = require('crypto');

const clients = [
  {
    id: randomUUID(),
    name: 'Northwind Holdings',
    domain: 'northwind.example.com',
    keywords: ['Northwind', 'Holdings']
  },
  {
    id: randomUUID(),
    name: 'Contoso Labs',
    domain: 'contoso.example.com',
    keywords: ['Contoso', 'Labs']
  }
];

const pressReleases = [
  {
    id: randomUUID(),
    clientId: clients[0].id,
    title: 'Northwind Holdings expands into energy storage',
    keywords: ['energy storage', 'Northwind'],
    active: true
  },
  {
    id: randomUUID(),
    clientId: clients[1].id,
    title: 'Contoso Labs launches AI research initiative',
    keywords: ['AI research', 'Contoso Labs'],
    active: true
  }
];

const mediaMentions = [];
const searchJobs = [];
const publications = {};

module.exports = {
  clients,
  pressReleases,
  mediaMentions,
  searchJobs,
  publications
};
