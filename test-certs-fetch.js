    // test-fetch.js
    async function testFetch() {
      const url = 'https://auth.dev.documinds.net/realms/documinds/.well-known/openid-configuration';
      console.log(`Node.js version: ${process.version}`);
      console.log(`Attempting to fetch: ${url}`);
      try {
        const response = await fetch(url);
        console.log(`Status: ${response.status}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Successfully fetched and parsed JSON:');
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.error(`Failed to fetch. Status: ${response.status}`);
          const text = await response.text();
          console.error('Response text:', text);
        }
      } catch (error) {
        console.error('Node.js fetch failed with error:');
        console.error(error);
        if (error.cause) {
          console.error('Cause:', error.cause);
        }
      }
    }

    testFetch();