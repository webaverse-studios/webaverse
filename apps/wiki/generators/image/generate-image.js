import {stableDiffusionUrl} from '../../constants/endpoints.js';

export const generateImage = ({
  modelName,
  prefix,
}) => async ({
  name,
  description,
} = {}) => {
  
  
  //const s = `${prefix} ${description}`;
  //const u = `${stableDiffusionUrl}/image?s=${encodeURIComponent(s)}&model=${modelName}`;
  // console.log('generate image url 1', {u});
  // const res = await fetch(u);
  // console.log('generate image url 2', {u, status: res.status});

  const response = await fetch("https://stable-diffusion.webaverse.com/run/txt2img", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            description,
            description,
            "None",
            "None",
            20,
            "Euler a",
            false,
            false,
            1,
            1,
            7,
            -1,
            -1,
            0,
            0,
            0,
            false,
            512,
            512,
            false,
            0.7,
            0,
            0,
            "None",
            false,
            false,
            false,
            "hello world",
            "Nothing",
            "hello world",
            "Nothing",
            "hello world",
            true,
            false,
            false,
          ]
        })})
      .then(r => r.json())
      .then(
        r => {
          let data = r.data;
          return r.data[0][0];
        }
      );

      const file = await fetch(`https://stable-diffusion.webaverse.com/file=${response.name}`);

  if (file) {
    console.log("AAAAAAAA", file)
    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength > 0) {
      return arrayBuffer;
    } else {
      throw new Error(`generated empty image`);
    }
  } else {
    throw new Error(`invalid status: ${res.status}`);
  }
};