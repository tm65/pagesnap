import { Address4, Address6 } from 'ip-address';
import dns from 'dns/promises';

// List of private and reserved IP ranges to block
// Extracted from https://en.wikipedia.org/wiki/Reserved_IP_addresses
const BLOCKED_RANGES = [
  '0.0.0.0/8',       // Current network (only valid as source address)
  '10.0.0.0/8',      // Private network
  '100.64.0.0/10',   // Shared Address Space
  '127.0.0.0/8',     // Loopback
  '169.254.0.0/16',  // Link-local
  '172.16.0.0/12',   // Private network
  '192.0.0.0/24',    // IETF Protocol Assignments
  '192.0.2.0/24',    // TEST-NET-1, documentation and examples
  '192.88.99.0/24',  // 6to4 relay anycast
  '192.168.0.0/16',  // Private network
  '198.18.0.0/15',   // Network benchmark tests
  '198.51.100.0/24', // TEST-NET-2, documentation and examples
  '203.0.113.0/24',  // TEST-NET-3, documentation and examples
  '224.0.0.0/4',     // IP multicast
  '240.0.0.0/4',     // Reserved for future use
  '255.255.255.255/32', // Broadcast address
  '::/128',          // Unspecified address
  '::1/128',         // Loopback address
  '100::/64',        // Discard prefix
  '2001::/23',       // IETF Protocol Assignments
  '2001:db8::/32',   // Documentation
  'fc00::/7',        // Unique local address
  'fe80::/10',       // Link-local address
  'ff00::/8',        // Multicast
];

async function isSafeUrl(url) {
  try {
    const { hostname } = new URL(url);

    // Prevent requests to the AWS metadata service
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return false;
    }

    const addresses = await dns.resolve(hostname);
    if (!addresses || addresses.length === 0) {
      return false; // No DNS resolution
    }

    for (const address of addresses) {
      const ip = Address4.isValid(address) ? new Address4(address) : new Address6(address);
      for (const range of BLOCKED_RANGES) {
        if (ip.isInSubnet(range)) {
          console.warn(`Blocked request to unsafe IP range: ${hostname} -> ${address} (in ${range})`);
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error(`SSRF check failed for URL: ${url}`, error);
    return false; // Fail safe
  }
}

export function ssrfProtection(req, res, next) {
  const urls = req.body.urls || (req.query.url ? [req.query.url] : []);
  
  if (urls.length === 0) {
    return next();
  }

  const checks = urls.map(isSafeUrl);
  
  Promise.all(checks).then(results => {
    if (results.every(isSafe => isSafe)) {
      next();
    } else {
      res.status(400).json({ error: 'One or more URLs are invalid or point to a reserved IP range.' });
    }
  });
}
