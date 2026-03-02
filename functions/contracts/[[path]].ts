interface Env {
  SUPABASE_URL: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const params = context.params.path;
  const path = Array.isArray(params) ? params.join('/') : params;

  const supabaseUrl =
    context.env.SUPABASE_URL ||
    'https://uckvtkxicdbdavbwhqky.supabase.co';

  const fileUrl = `${supabaseUrl}/storage/v1/object/public/contracts/${path}`;

  const response = await fetch(fileUrl);

  if (!response.ok) {
    return new Response('Not found', { status: 404 });
  }

  const contentType =
    response.headers.get('Content-Type') || 'application/octet-stream';
  const contentDisposition = response.headers.get('Content-Disposition');

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'private, max-age=3600',
  };

  if (contentDisposition) {
    headers['Content-Disposition'] = contentDisposition;
  }

  return new Response(response.body, { headers });
};
