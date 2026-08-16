export interface Resource {
  /** Card title. */
  name: string;
  /** Destination. External sites get their own subdomain or domain. */
  url: string;
  /** Filename under public/images/. */
  image: string;
  /** Alt text for the card image. */
  alt: string;
  /** Short status pill, e.g. "Live". */
  badge: string;
  /** One-sentence description. */
  description: string;
}

// Adding a resource is a data edit — the card grid in src/index.njk loops this.
// Cards are shown in this order.
const resources: Resource[] = [
  {
    name: 'Moths',
    url: 'https://moths.pnwinsects.org',
    image: 'card-moths.webp',
    alt: 'Oreta rosea, a pink and tan hooktip moth specimen',
    badge: 'Live',
    description: '1,200+ macromoth species, with factsheets, plates, and distribution maps.',
  },
];

export default function (): Resource[] {
  return resources;
}
