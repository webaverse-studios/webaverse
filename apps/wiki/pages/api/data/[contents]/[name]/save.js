// import stream from "stream";
import uuidByString from "uuid-by-string";
import {Ctx} from "../../../../../clients/context.js";
import {cleanName} from "../../../../../utils.js";

export default async function handler(req, res) { 
    const {contents, name} = req.query;
    const type = contents ? contents.replace(/s$/, "") : "";
    let setName = name || "";
    
    setName = cleanName(setName);

    const c = new Ctx();
    const title = `${type}/${setName}`;

    if (req?.body) {
        
        await c.databaseClient.setByName(
            "Content",
            title,
            req.body,
        );
        res.send(200);
    } else {
        res.send(500)
    }
}