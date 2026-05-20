// utils/cache.js
const NodeCache = require('node-cache');
// default TTL 5 minutes (300 seconds), check period 1 minute
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false });

module.exports = {
  get: (key) => cache.get(key),
  set: (key, value, ttl) => cache.set(key, value, ttl),
  del: (key) => cache.del(key),
  flush: () => cache.flushAll(),
};
