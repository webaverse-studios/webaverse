import Head from "next/head";
import React from "react";

export const MetaTags = props => {
    const {title, description, image, url} = props;
    return (
        <Head>
            <title>{title}</title>
            <meta name="description" content={description} />

            {/* Schema.org markup for Google+ */}
            <meta itemprop="name" content={title} />
            <meta itemprop="description" content={description} />
            <meta itemprop="image" content={image} />

            {/* Twitter Card data */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content="@webaverse" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:creator" content="@webaverse" />

            {/* Twitter summary card with large image must be at least 280x150px */}
            <meta name="twitter:image:src" content={image} />

            {/* Open Graph data */}
            <meta property="og:title" content={title} />
            <meta property="og:type" content="article" />
            <meta property="og:url" content={url} />
            <meta property="og:image" content={image} />
            <meta property="og:description" content={description} />
            <meta property="og:site_name" content="Webaverse Wiki" />
        </Head>
    );
};