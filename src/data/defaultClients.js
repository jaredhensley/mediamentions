const defaultClients = [
  {
    name: 'Bushwick Commission',
    alertsRssFeedUrl:
      'https://www.google.com/alerts/feeds/12277839355779284945/15452633955229054563'
  },
  {
    name: 'Colombia Avocado Board',
    alertsRssFeedUrl:
      'https://www.google.com/alerts/feeds/12277839355779284945/5891787875746977269'
  },
  {
    name: 'Dakota Angus',
    alertsRssFeedUrl:
      'https://www.google.com/alerts/feeds/12277839355779284945/5394668584141517505'
  },
  {
    name: 'Equitable Food Initiative',
    alertsRssFeedUrl:
      'https://www.google.com/alerts/feeds/12277839355779284945/9496190101090109475'
  },
  {
    name: 'Full Tilt Marketing',
    alertsRssFeedUrl:
      'https://www.google.com/alerts/feeds/12277839355779284945/10879197021612034583'
  },
  {
    name: 'G&R Farms',
    alertsRssFeedUrl:
      'https://www.google.com/alerts/feeds/12277839355779284945/3503936387713251422'
  },
  {
    name: 'Michigan Asparagus Advisory Board',
    alertsRssFeedUrl:
      'https://www.google.com/alerts/feeds/12277839355779284945/1073786038600524173'
  },
  {
    name: 'North Carolina Sweetpotato Commission',
    alertsRssFeedUrl:
      'https://www.google.com/alerts/feeds/12277839355779284945/5350096587483878217'
  },
  {
    name: 'North Dakota 250',
    alertsRssFeedUrl:
      'https://www.google.com/alerts/feeds/12277839355779284945/17970536733701573570'
  },
  {
    name: 'Todd Greiner Farms',
    alertsRssFeedUrl:
      'https://www.google.com/alerts/feeds/12277839355779284945/1239306593365033834'
  },
  {
    name: 'South Texas Onion Committee',
    alertsRssFeedUrl:
      'https://www.google.com/alerts/feeds/12277839355779284945/120938263306000695'
  },
  {
    name: 'Texas Watermelon Association',
    alertsRssFeedUrl:
      'https://www.google.com/alerts/feeds/12277839355779284945/4075752693924405968'
  }
];

function buildContactEmail(name) {
  return `press@${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.example.com`;
}

module.exports = defaultClients.map((client) => ({
  name: client.name,
  contactEmail: buildContactEmail(client.name),
  alertsRssFeedUrl: client.alertsRssFeedUrl || null
}));
