export async function onRequestGet(context) {
  const { params, env, request } = context;
  const slug = params.slug;

  // Fetch just the client_name for this slug from Supabase
  let clientName = null;
  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/proposals?slug=eq.${encodeURIComponent(slug)}&select=client_name`,
      {
        headers: {
          apikey: env.SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
        },
      }
    );
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.client_name) {
      clientName = data[0].client_name;
    }
  } catch (_) {
    // Fall through — serve the page without modified title
  }

  // Serve index.html from the static assets
  const assetResponse = await env.ASSETS.fetch(
    new Request(new URL("/", request.url))
  );

  if (!clientName) {
    return assetResponse;
  }

  const title = `Shoothill Proposal for ${clientName}`;

  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(title);
      },
    })
    .on('meta[property="og:title"]', {
      element(el) {
        el.setAttribute("content", title);
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        el.setAttribute("content", title);
      },
    })
    .on('meta[property="og:description"]', {
      element(el) {
        el.setAttribute("content", title);
      },
    })
    .transform(assetResponse);
}
