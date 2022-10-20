import * as WebMWriter from 'webm-writer';

const writers = {
  get webmWriter() {
    return WebMWriter;
  },
};
export default writers;