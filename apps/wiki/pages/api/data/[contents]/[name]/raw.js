// import stream from "stream";
import {Ctx} from "../../../../../clients/context.js";
import {cleanName} from "../../../../../utils.js";

export default async function handler(req, res) {
  // const match = req.url.match(/^\/api\/data\/([^\/]*)\/([^\/]*)/);
  // let type = match ? match[1].replace(/s$/, '') : '';
  // let name = match ? match[2] : '';

  // A safer way to get the URL params
  const type = req.query?.contents ? req.query?.contents.replace(/s$/, '') : '';
  let name = req.query?.name ? req.query?.name : '';

  name = decodeURIComponent(name);
  name = cleanName(name);

  const c = new Ctx();
  const title = `${type}/${name}`;
  const query = await c.databaseClient.getByName('Content', title);

  if(query) {
    const {content: text} = query;
    res.json(query);
  } else {

    res.send(404)
  }

}