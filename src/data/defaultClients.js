const defaultClients = [
  { name: 'Bushwick Commission' },
  { name: 'Colombia Avocado Board' },
  { name: 'Dakota Angus' },
  { name: 'Equitable Food Initiative' },
  { name: 'Full Tilt Marketing' },
  { name: 'G&R Farms' },
  { name: 'Michigan Asparagus Advisory Board' },
  { name: 'North Carolina Sweetpotato Commission' },
  { name: 'North Dakota 250' },
  { name: 'Todd Greiner Farms' },
  { name: 'South Texas Onion Committee' },
  { name: 'Texas Watermelon Association' },
];

function buildContactEmail(name) {
  return `press@${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.example.com`;
}

module.exports = defaultClients.map((client) => ({
  name: client.name,
  contactEmail: buildContactEmail(client.name),
}));
