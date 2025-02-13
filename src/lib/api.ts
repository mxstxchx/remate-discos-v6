interface PostgRESTRequest {
  method: string;
  path: string;
  body?: object;
}

export async function sqlToRest({ sql }: { sql: string }): Promise<PostgRESTRequest> {
  const response = await fetch('/api/sql-to-rest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql })
  });

  if (!response.ok) {
    throw new Error('Failed to convert SQL to REST query');
  }

  return response.json();
}

export async function postgrestRequest({ method, path, body }: PostgRESTRequest) {
  const response = await fetch(`/api/postgrest${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw new Error('PostgREST request failed');
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}