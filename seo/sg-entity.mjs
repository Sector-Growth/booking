/**
 * Sector Growth's shared entity graph: one Organization, identified by one @id,
 * that every SG hostname defines or references. Copy this module (or the
 * generated organization.jsonld) into a site; never mint a per-host
 * Organization @id such as https://apps.sectorgrowth.com/#organization.
 *
 * Facts come from what SG already publishes (integrations-directory and
 * resimpli-to-hubspot src/lib/site.ts and credentials.ts). Nothing here is new:
 *  - name, url, email, Toronto/ON/CA address, "Elite HubSpot Solutions Partner",
 *    "North America" market, LinkedIn: from site.ts in both repos;
 *  - hasCredential: credentials.ts in integrations-directory (Google Partner is
 *    withheld at the owner's request and stays out);
 *  - sameAs adds SG's HubSpot Solutions Directory listing, verified live on
 *    2026-10-30 (ecosystem.hubspot.com/marketplace/solutions/sector).
 * People are first name only, the owner's rule for every SG surface.
 *
 * Logo: https://sectorgrowth.com/assets/sector-logo.svg returns 404 until the
 * new homepage is served on sectorgrowth.com, so the logo points at the same
 * file on apps.sectorgrowth.com, which answers 200 today. Switch LOGO_URL when
 * sectorgrowth.com serves /assets/.
 */

export const ORG_ID = 'https://sectorgrowth.com/#organization';
export const LOGO_URL = 'https://apps.sectorgrowth.com/brand/sector-logo.svg';

const CREDENTIALS = [
  ['HubSpot Elite Solutions Partner', 'Partner program', 'HubSpot'],
  ['HubSpot Custom Integration Accreditation', 'Accreditation', 'HubSpot'],
  ['HubSpot CRM Data Migration Accreditation', 'Accreditation', 'HubSpot'],
  ['HubSpot Solutions Architecture Design Accreditation', 'Accreditation', 'HubSpot'],
  ['HubSpot Onboarding Accreditation', 'Accreditation', 'HubSpot'],
  ['HubSpot Academy Accreditations', 'Accreditation', 'HubSpot'],
  ['HubSpot Healthcare Industry Specialist', 'Industry specialization', 'HubSpot'],
  ['HubSpot Financial Services Industry Specialist', 'Industry specialization', 'HubSpot'],
  ['HubSpot Manufacturing Industry Specialist', 'Industry specialization', 'HubSpot'],
  ['HubSpot Quote to Cash Capability', 'Capability', 'HubSpot'],
  ['Anthropic Solutions Partner', 'Partner program', 'Anthropic'],
];
const ISSUER_URL = { HubSpot: 'https://www.hubspot.com/', Anthropic: 'https://www.anthropic.com/' };

/** The full Organization node. Put it on each host's home page; reference ORG_ID everywhere else. */
export const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'Sector Growth',
  url: 'https://sectorgrowth.com',
  logo: { '@type': 'ImageObject', url: LOGO_URL },
  description: 'Elite HubSpot Solutions Partner and CRM integration consultancy serving North America.',
  email: 'hello@sectorgrowth.com',
  address: { '@type': 'PostalAddress', addressLocality: 'Toronto', addressRegion: 'ON', addressCountry: 'CA' },
  areaServed: 'North America',
  knowsAbout: ['HubSpot', 'HubSpot integrations', 'CRM data migration', 'HubSpot onboarding', 'HubSpot training', 'AI agents in HubSpot'],
  contactPoint: { '@type': 'ContactPoint', contactType: 'sales', email: 'hello@sectorgrowth.com', url: 'https://book.sectorgrowth.com/', areaServed: 'North America', availableLanguage: 'en' },
  sameAs: ['https://www.linkedin.com/company/sectorgrowth', 'https://ecosystem.hubspot.com/marketplace/solutions/sector'],
  hasCredential: CREDENTIALS.map(([name, credentialCategory, issuer]) => ({
    '@type': 'EducationalOccupationalCredential',
    name,
    credentialCategory,
    recognizedBy: { '@type': 'Organization', name: issuer, url: ISSUER_URL[issuer] },
  })),
};

/** A reference to the Organization, for publisher, provider, author (org), about. */
export const ORG_REF = { '@id': ORG_ID };

/** People who author or appear: first names only, worksFor the shared Organization. */
export const PEOPLE = {
  prash: { '@type': 'Person', '@id': 'https://sectorgrowth.com/#person-prash', name: 'Prash', jobTitle: 'Lead of Technical Integrations and AI Solutions', worksFor: ORG_REF },
  sean: { '@type': 'Person', '@id': 'https://sectorgrowth.com/#person-sean', name: 'Sean', jobTitle: 'HubSpot Architect and HubSpot Certified Trainer', worksFor: ORG_REF },
};

/**
 * The WebSite node for one hostname. `name` is the site name Google may show:
 * keep it identical to og:site_name. For subdomains, "Sector Growth" plus an
 * alternateName for the property reads best (Google supports site names at
 * domain and subdomain level, not for subdirectories).
 */
export function website({ origin, name = 'Sector Growth', alternateName, inLanguage = 'en-CA' }) {
  return {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name,
    ...(alternateName ? { alternateName } : {}),
    url: `${origin}/`,
    inLanguage,
    publisher: ORG_REF,
  };
}

/** WebPage (or a subtype) for one URL. */
export function webPage({ url, name, description, origin, type = 'WebPage', dateModified, breadcrumbId, about }) {
  return {
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: { '@id': `${origin}/#website` },
    publisher: ORG_REF,
    ...(about ? { about } : {}),
    ...(breadcrumbId ? { breadcrumb: { '@id': breadcrumbId } } : {}),
    ...(dateModified ? { dateModified } : {}),
  };
}

export function breadcrumbs(url, crumbs) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
  };
}

/** One @graph per page: the page's nodes, with the Organization defined on home pages only. */
export function graph(nodes, { includeOrganization = false } = {}) {
  const { '@context': _ctx, ...org } = ORGANIZATION;
  return { '@context': 'https://schema.org', '@graph': [...(includeOrganization ? [org] : []), ...nodes] };
}

/** JSON for a <script type="application/ld+json">, safe against "</script>" in values. */
export function serialize(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
