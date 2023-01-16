import weaviate from 'weaviate-client';
import schemas from '../../schemas/schemas.js';

const client = weaviate.client({
  scheme: 'http',
  host: 'weaviate.webaverse.com',
});

(async () => {
  /* await client
    .schema
    .getter()
    .do(); */
  for (const schema of schemas) {
    try {
      await client.schema
        .classCreator()
        .withClass(schema)
        .do();
      console.log(`created ${schema.class}`);
    } catch(err) {
      if (/422/.test(err)) { // already exists
        console.log(`already exists ${schema.class}`);
      } else {
        throw err;
      }
    }
  }
})();