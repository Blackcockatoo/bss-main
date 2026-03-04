export const BRAND_UI = {
  productName: 'The Veil',
  teacherHubTitle: 'The Veil — Teacher Hub',
  teacherHubDescription:
    'Privacy-first teacher mentorship hub. Enchant, bless, whisper. Never watch.',
  mentorSanctuaryName: 'Mentor\'s Sanctuary',
  legalDetailsLinkLabel: 'Legal details',
} as const;

export const BRAND_LEGAL = {
  studioName: 'Blue Snake Studios',
  rightsHolderName: 'Blackcockatoo',
  productFamilyName: 'Jewble',
} as const;

export const LEGAL_TEXT =
  `All ${BRAND_LEGAL.productFamilyName} branding and creative IP remains the property of ${BRAND_LEGAL.studioName}; the school receives a limited educational-use license.`;

export function getCopyrightNotice(year = new Date().getFullYear()): string {
  return `© ${year} ${BRAND_LEGAL.studioName} — ${LEGAL_TEXT}`;
}
