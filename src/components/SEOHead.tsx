import React, { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  schema?: object;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = "BharatKart | India's Premier Online Shopping Destination",
  description = "Shop authentic Indian products, top electronics, ethnic sarees, kurtas, organic spices, and Ayurvedic wellness. Fast delivery across 19,000+ PIN codes with UPI & COD.",
  schema,
}) => {
  useEffect(() => {
    document.title = title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);

    // Inject JSON-LD Schema
    let scriptTag = document.getElementById('seo-structured-data');
    if (schema) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'seo-structured-data';
        scriptTag.setAttribute('type', 'application/ld+json');
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schema);
    }
  }, [title, description, schema]);

  return null;
};
