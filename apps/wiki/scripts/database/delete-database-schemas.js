import weaviate from 'weaviate-client';
import schemas from '../../schemas/schemas.js';

const client = weaviate.client({
  scheme: 'http',
  host: 'weaviate-server.webaverse.com',
});

(async () => {
  for (const schema of schemas) {
    await client.schema
      .classDeleter()
      .withClassName(schema.class)
      .do();
    console.log(`deleted ${schema.class}`);
  }
})();