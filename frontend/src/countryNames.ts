import i18n from '../i18n';

// Country name translations - only for countries that speak our supported languages
// All other countries keep their English API names
const countryNames: Record<string, Record<string, string>> = {
  fr: {
    FR: 'France', BE: 'Belgique', CH: 'Suisse', LU: 'Luxembourg', MC: 'Monaco',
    SN: 'Sénégal', CI: "Côte d'Ivoire", ML: 'Mali', BF: 'Burkina Faso', NE: 'Niger',
    TG: 'Togo', BJ: 'Bénin', GA: 'Gabon', CG: 'Congo', CD: 'RD Congo',
    CM: 'Cameroun', MG: 'Madagascar', HT: 'Haïti', CA: 'Canada',
    NL: 'Pays-Bas', SR: 'Suriname',
    DE: 'Allemagne', AT: 'Autriche', LI: 'Liechtenstein',
    ES: 'Espagne', MX: 'Mexique', CO: 'Colombie', AR: 'Argentine',
    PE: 'Pérou', VE: 'Venezuela', CL: 'Chili', EC: 'Équateur',
    GT: 'Guatemala', CU: 'Cuba', BO: 'Bolivie', DO: 'République Dominicaine',
    HN: 'Honduras', PY: 'Paraguay', SV: 'El Salvador', NI: 'Nicaragua',
    CR: 'Costa Rica', PA: 'Panama', UY: 'Uruguay', PR: 'Porto Rico',
    BR: 'Brésil', PT: 'Portugal', AO: 'Angola', MZ: 'Mozambique',
    GW: 'Guinée-Bissau', TL: 'Timor oriental', CV: 'Cap-Vert', ST: 'São Tomé-et-Príncipe',
  },
  nl: {
    FR: 'Frankrijk', BE: 'België', CH: 'Zwitserland', LU: 'Luxemburg', MC: 'Monaco',
    SN: 'Senegal', CI: 'Ivoorkust', ML: 'Mali', BF: 'Burkina Faso', NE: 'Niger',
    TG: 'Togo', BJ: 'Benin', GA: 'Gabon', CG: 'Congo', CD: 'DR Congo',
    CM: 'Kameroen', MG: 'Madagaskar', HT: 'Haïti', CA: 'Canada',
    NL: 'Nederland', SR: 'Suriname',
    DE: 'Duitsland', AT: 'Oostenrijk', LI: 'Liechtenstein',
    ES: 'Spanje', MX: 'Mexico', CO: 'Colombia', AR: 'Argentinië',
    PE: 'Peru', VE: 'Venezuela', CL: 'Chili', EC: 'Ecuador',
    GT: 'Guatemala', CU: 'Cuba', BO: 'Bolivia', DO: 'Dominicaanse Republiek',
    HN: 'Honduras', PY: 'Paraguay', SV: 'El Salvador', NI: 'Nicaragua',
    CR: 'Costa Rica', PA: 'Panama', UY: 'Uruguay', PR: 'Puerto Rico',
    BR: 'Brazilië', PT: 'Portugal', AO: 'Angola', MZ: 'Mozambique',
    GW: 'Guinee-Bissau', TL: 'Oost-Timor', CV: 'Kaapverdië', ST: 'Sao Tomé en Príncipe',
  },
  de: {
    FR: 'Frankreich', BE: 'Belgien', CH: 'Schweiz', LU: 'Luxemburg', MC: 'Monaco',
    SN: 'Senegal', CI: 'Elfenbeinküste', ML: 'Mali', BF: 'Burkina Faso', NE: 'Niger',
    TG: 'Togo', BJ: 'Benin', GA: 'Gabun', CG: 'Kongo', CD: 'DR Kongo',
    CM: 'Kamerun', MG: 'Madagaskar', HT: 'Haiti', CA: 'Kanada',
    NL: 'Niederlande', SR: 'Suriname',
    DE: 'Deutschland', AT: 'Österreich', LI: 'Liechtenstein',
    ES: 'Spanien', MX: 'Mexiko', CO: 'Kolumbien', AR: 'Argentinien',
    PE: 'Peru', VE: 'Venezuela', CL: 'Chile', EC: 'Ecuador',
    GT: 'Guatemala', CU: 'Kuba', BO: 'Bolivien', DO: 'Dominikanische Republik',
    HN: 'Honduras', PY: 'Paraguay', SV: 'El Salvador', NI: 'Nicaragua',
    CR: 'Costa Rica', PA: 'Panama', UY: 'Uruguay', PR: 'Puerto Rico',
    BR: 'Brasilien', PT: 'Portugal', AO: 'Angola', MZ: 'Mosambik',
    GW: 'Guinea-Bissau', TL: 'Osttimor', CV: 'Kap Verde', ST: 'São Tomé und Príncipe',
  },
  es: {
    FR: 'Francia', BE: 'Bélgica', CH: 'Suiza', LU: 'Luxemburgo', MC: 'Mónaco',
    SN: 'Senegal', CI: 'Costa de Marfil', ML: 'Malí', BF: 'Burkina Faso', NE: 'Níger',
    TG: 'Togo', BJ: 'Benín', GA: 'Gabón', CG: 'Congo', CD: 'RD Congo',
    CM: 'Camerún', MG: 'Madagascar', HT: 'Haití', CA: 'Canadá',
    NL: 'Países Bajos', SR: 'Surinam',
    DE: 'Alemania', AT: 'Austria', LI: 'Liechtenstein',
    ES: 'España', MX: 'México', CO: 'Colombia', AR: 'Argentina',
    PE: 'Perú', VE: 'Venezuela', CL: 'Chile', EC: 'Ecuador',
    GT: 'Guatemala', CU: 'Cuba', BO: 'Bolivia', DO: 'República Dominicana',
    HN: 'Honduras', PY: 'Paraguay', SV: 'El Salvador', NI: 'Nicaragua',
    CR: 'Costa Rica', PA: 'Panamá', UY: 'Uruguay', PR: 'Puerto Rico',
    BR: 'Brasil', PT: 'Portugal', AO: 'Angola', MZ: 'Mozambique',
    GW: 'Guinea-Bisáu', TL: 'Timor Oriental', CV: 'Cabo Verde', ST: 'Santo Tomé y Príncipe',
  },
  pt: {
    FR: 'França', BE: 'Bélgica', CH: 'Suíça', LU: 'Luxemburgo', MC: 'Mônaco',
    SN: 'Senegal', CI: 'Costa do Marfim', ML: 'Mali', BF: 'Burkina Faso', NE: 'Níger',
    TG: 'Togo', BJ: 'Benim', GA: 'Gabão', CG: 'Congo', CD: 'RD Congo',
    CM: 'Camarões', MG: 'Madagáscar', HT: 'Haiti', CA: 'Canadá',
    NL: 'Países Baixos', SR: 'Suriname',
    DE: 'Alemanha', AT: 'Áustria', LI: 'Liechtenstein',
    ES: 'Espanha', MX: 'México', CO: 'Colômbia', AR: 'Argentina',
    PE: 'Peru', VE: 'Venezuela', CL: 'Chile', EC: 'Equador',
    GT: 'Guatemala', CU: 'Cuba', BO: 'Bolívia', DO: 'República Dominicana',
    HN: 'Honduras', PY: 'Paraguai', SV: 'El Salvador', NI: 'Nicarágua',
    CR: 'Costa Rica', PA: 'Panamá', UY: 'Uruguai', PR: 'Porto Rico',
    BR: 'Brasil', PT: 'Portugal', AO: 'Angola', MZ: 'Moçambique',
    GW: 'Guiné-Bissau', TL: 'Timor-Leste', CV: 'Cabo Verde', ST: 'São Tomé e Príncipe',
  },
};

/**
 * Returns the localized country name if available, otherwise returns the original English name.
 * @param countryCode - ISO 3166-1 alpha-2 code (e.g., "BE", "FR")
 * @param englishName - The English name from the API
 */
export function getLocalizedCountryName(countryCode: string, englishName: string): string {
  const lang = i18n.language;
  if (lang === 'en') return englishName;
  return countryNames[lang]?.[countryCode.toUpperCase()] || englishName;
}
