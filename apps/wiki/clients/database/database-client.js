import uuidByString from 'uuid-by-string';
import weaviate from 'weaviate-client';

export class DatabaseClient {
  constructor() {
    /* const weaviateApiKey = process.env.WEAIVATE_API_KEY;
    if (!weaviateApiKey) {
      throw new Error('no weaviate api key found');
    } */
    this.client = weaviate.client({
      scheme: 'http',
      host: 'weaviate.webaverse.com',
    });
  }

  async getByName(className, title) {
    // const id = uuidByString(title);
    const result = await this.client.graphql
      .get()
      .withClassName(className)
      .withFields('title content type')
      .withWhere({
        operator: 'Equal',
        path: [
          'title',
        ],
        valueString: title,
      })
      .do()
      .then(res => {
        // console.log("Result", res)
        return res;
      })
      .catch(err => {
        console.error(err)
      });
    // console.log('got result', result?.data?.Get?.[className]?.[0]);
    return result?.data?.Get?.[className]?.[0];
  }

  async setByName(className, title, content) {
    const _formatData = (title, content) => {
      if (typeof content === 'string') {
        const match = title.match(/^([^\/]+)\/[\s\S]*/);
        if (match) {
          const type = match[1];
          // const v = j[k];
          // value.type = type;
          // const match = k.match(/^([^\/]+)/);
          // const type = match?.[1] ?? '';
          // v.type = type;
          return {
            class: className,
            id: uuidByString(title),
            properties: {
              title,
              content,
              type,
            },
          };
        } else {
          return null;
        }
      } else {
        return null;
      }
    };
    const _uploadDatas = async datas => {
      const batcher = this.client.batch.objectsBatcher();
      for (const data of datas) {
        batcher.withObject(data);
      }
      const result = await batcher.do();
      let ok = true;
      for (const item of result) {
        if (item.result.errors) {
          console.warn(item.result.errors);
          ok = false;
        }
      }
      return ok;
    };

    const data = _formatData(title, content);
    if (!data) {
      throw new Error('invalid data');
    }
    const ok = await _uploadDatas([data]);
    if (!ok) {
      throw new Error('failed to upload data');
    }
  }
}