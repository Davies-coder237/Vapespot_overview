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
  // Évite le doublon "Open open 24/7" quand hours commence déjà par "Open".
  let hours: string;
  if (!listing.hours) {
    hours = "24/7";
  } else {
    const lower = listing.hours.toLowerCase();
    hours = lower.startsWith("open ") ? lower : `open ${lower}`;
  }
  return `Planning to vape in ${cn}? VapeSpot delivers to ${listing.cityTag} and nearby suburbs, ${hours}. Whether you need a new pod, a spare coil, or some straight advice, order from VapeSpot and the team at ${listing.businessName} will sort you out — delivered to you, no queues, no upselling.`;
}

export interface FaqItem {
  q: string;
  a: string;
}

/** 4 questions propres à la ville (nom, adresse, horaires injectés). */
export function cityFaq(listing: Listing): FaqItem[] {
  const cn = cityName(listing);
  const business = listing.businessName;
  const hours = listing.hours ?? "open 24/7";
  const at = listing.address ? `, at ${listing.address}` : "";
  return [
    {
      q: `Is there a vape shop in ${cn}?`,
      a: `Yes — ${business} delivers vaporisers, pods and mods to ${listing.cityTag} and nearby suburbs${at}, with fast delivery and 24/7 ordering.`,
    },
    {
      q: `What brands does ${business} stock?`,
      a: `${business} carries a curated range of vaporisers, pods, mods and e-liquids, including the brands featured on vapespot.store.`,
    },
    {
      q: `Does VapeSpot deliver to ${cn}?`,
      a: `Yes. VapeSpot offers fast courier delivery to ${cn} and nearby suburbs — usually within 30 minutes to 2 hours — or via Australia Post for longer distances.`,
    },
    {
      q: `What are the opening hours in ${cn}?`,
      a: `${business} is ${hours}.`,
    },
  ];
}