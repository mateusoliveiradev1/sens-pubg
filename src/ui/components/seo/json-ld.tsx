/**
 * JsonLd Component
 * Injects structured data into the <head> for SEO.
 */

import React from 'react';

interface JsonLdProps {
    data: Record<string, any>;
}

export function JsonLd({ data }: JsonLdProps) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}
