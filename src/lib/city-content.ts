/**
 * Contenu SEO généré par ville — rend chaque page liste locale réellement
 * unique (anti doorway pages) sans maintenance manuelle.
 */

export interface Listing {
  slug: string;
  businessName: string;
  category: string;
  cityTag: string;
  address?: string;
  phone?: string;
  hours?: string;
  description: string;
}

/** Extrait un nom de ville propre : "Sydney CBD NSW" -> "Sydney CBD". */
export function cityName(listing: Listing): string {
  const m = listing.cityTag.match(/^(.+?)\s+(?:NSW|VIC|QLD|WA|SA|TAS|NT|ACT)\b/i);
  return m ? m[1].trim() : listing.cityTag;
}

export function localBlurb(listing: Listing): string {
  const cn = cityName(listing);
  return `Planning to vape in ${cn}? VapeSpot delivers to ${listing.cityTag} and nearby suburbs, 24/7. Whether you need a new pod, a spare coil, or some straight advice, order from VapeSpot and the team at ${listing.businessName} will sort you out — delivered to you, no queues, no upselling.`;
}

export interface FaqItem {
  q: string;
  a: string;
}

/** 3 questions propres à la ville (nom, marques, livraison). */
export function cityFaq(listing: Listing): FaqItem[] {
  const cn = cityName(listing);
  const business = listing.businessName;
  return [
    {
      q: `Is there a vape shop in ${cn}?`,
      a: `Yes — ${business} delivers vaporisers, pods and mods to ${listing.cityTag} and nearby suburbs, with fast delivery and 24/7 ordering.`,
    },
    {
      q: `What brands does ${business} stock?`,
      a: `${business} carries a curated range of vaporisers, pods, mods and e-liquids, including the brands featured on vapespot.store.`,
    },
    {
      q: `Does VapeSpot deliver to ${cn}?`,
      a: `Yes. VapeSpot offers fast courier delivery to ${cn} and nearby suburbs — usually within 30 minutes to 2 hours — or via Australia Post for longer distances.`,
    },
  ];
}