export function query(document: string, variables: Record<string, any> = {}) {
    return fetch('https://localhost:3000/shop-api', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'vendure-token': 'merchant_channel',
        },
        credentials: 'include',
        body: JSON.stringify({
          query: document,
          variables,
        }),
    })
      .then((res) => res.json())
      .catch((err) => console.log(err));
}