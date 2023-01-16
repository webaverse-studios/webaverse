// import stream from 'stream';
import crypto from 'crypto';
// import {Web3Storage} from 'web3.storage';
import mime from 'mime-types';
import {
  S3Client,
  // GetObjectCommand,
  PutObjectCommand,
  // AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';

const encoding = 'hex';

const _getFileHash = async file => {
  const hash = crypto.createHash('sha3-256');
  const ab = await file.arrayBuffer();
  const uint8Array = new Uint8Array(ab);
  hash.update(uint8Array);
  return hash.digest(encoding);
};
// hash the list of hashes, merkle style
const _hashHashes = hashes => {
  const hash = crypto.createHash('sha3-256');
  for (const hash of hashes) {
    hash.update(hash);
  }
  return hash.digest(encoding);
};

//

const region = process.env.AWS_REGION || 'us-west-2';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID_WEBAVERSE;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY_WEBAVERSE;
const bucketName = process.env.AWS_BUCKET_NAME_WEBAVERSE || 'wiki.webaverse.com';
const endpoint = process.env.AWS_ENDPOINT_WEBAVERSE;
const urlBase = process.env.AWS_S3_URL_BASE_WEBAVERSE || `https://s3.${region}.amazonaws.com`;

export class StorageClient {
  constructor() {
    /* const w3sApiKey = process.env.W3S_API_KEY;
    if (!w3sApiKey) {
      throw new Error('no w3s api key found');
    }
    this.client = new Web3Storage({
      token: w3sApiKey,
    }); */

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('no aws access key found');
    }

    let s3ClientConfig = {
      region,
      // bucketName,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    };

    // Allow overwriting the S3 endpoint URL for testing purposes
    if (endpoint) {
      s3ClientConfig.endpoint = endpoint;
    }

    this.bucketUrlBase = `${urlBase}/${bucketName}`;

    this.client = new S3Client(s3ClientConfig);
  }
  async uploadFile(file) {
    const {name} = file;

    // console.log('upload file 1');
    const hash = await _getFileHash(file);
    // console.log('upload file 2', {hash});

    const ab = await file.arrayBuffer();

     /* console.log('put object 1', {
       Bucket: bucketName,
       Key: `${hash}/${name}`,
       Body: ab,
   }); */
    const contentType = mime.lookup(name);
    //console.log("Bucket Name", bucketName)
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `${hash}/${name}`,
      // Body: file,
      Body: ab,
      ContentType: contentType,
    });
    // console.log('put object 2');

    // wait for the command to complete
    const result = await this.client.send(command);
    // console.log('upload result', result);

    return hash;
  }
  async uploadFiles(files) {
    const hashes = await Promise.all(files.map(async file => {
      const hash = await _getFileHash(file);
      return hash;
    }));
    const metaHash = _hashHashes(hashes);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const {name} = file;

      const ab = await file.arrayBuffer();

      // console.log('put objects 1', {
      //   Bucket: bucketName,
      //   Key: `${metaHash}/${name}`,
      //   Body: ab,
      // });
      const contentType = mime.lookup(name);
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: `${metaHash}/${name}`,
        Body: ab,
        ContentType: contentType,
      });
      // console.log('put objects 2');

      // wait for the command to complete
      const result = await this.client.send(command);
      // console.log('uploads result', result);
    }

    // return await this.client.put(files);

    return metaHash;
  }
  /* async downloadFile(hash) {
    // XXX
  } */
  getUrl(hash, name) {
    // return `https://w3s.link/ipfs/${hash}/${name}`;
    return `${this.bucketUrlBase}/${hash}/${name}`;
  }
}