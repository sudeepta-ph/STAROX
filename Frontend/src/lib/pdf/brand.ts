// Shared STAROX PDF letterhead branding — the same logo asset and accent
// color used by every generated PDF (PmxDocumentPdf.tsx, PmxTasksPdf.ts) so
// PRD, artifact, and task exports all look like they came from one product.
//
// No dedicated letterhead assets exist in this repo: there is no
// internship-offer-letter / appointment-letter generator anywhere, no seal
// or stamp image, no signature image, and no color specifically designated
// as "brand" for official documents. This references the app's existing
// primary logo (public/assets/images/strx.png — used app-wide, e.g.
// Sidebar.tsx, App.tsx, Footer.tsx) rather than adding a new image file,
// and derives the accent color from the app's own --starox-blue CSS
// variable (204 78% 57%, defined in index.css) rather than inventing an
// undocumented brand value.
export const STAROX_LOGO_URL = "/assets/images/strx.png";
export const STAROX_BRAND_COLOR = "#3CA2E7";
export const STAROX_BRAND_COLOR_RGB: [number, number, number] = [60, 162, 231];

let cachedLogoDataUri: Promise<string> | null = null;

// jsPDF's addImage needs actual image bytes up front — it can't fetch a URL
// itself the way @react-pdf/renderer's <Image src="..."> can. Fetch the
// existing logo once per session and cache the base64 conversion, rather
// than adding a second copy of the PNG to the repo.
export function loadStaroxLogoDataUri(): Promise<string> {
  if (!cachedLogoDataUri) {
    cachedLogoDataUri = fetch(STAROX_LOGO_URL)
      .then(res => res.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      }));
  }
  return cachedLogoDataUri;
}
