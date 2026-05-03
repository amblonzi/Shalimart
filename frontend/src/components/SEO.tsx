interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  jsonLd?: Record<string, any>;
}

export default function SEO({
  title = 'Shalina Mart | Kenya\'s Best E-Commerce for Farm & Home',
  description = 'Your one-stop shop for quality products delivered across Kenya. From farm equipment to household essentials.',
  image = 'https://shalimart.co.ke/logo.png',
  url = 'https://shalimart.co.ke/',
  jsonLd,
}: SEOProps) {
  return (
    <>
      {/* Standard Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </>
  );
}
