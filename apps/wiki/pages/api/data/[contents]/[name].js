// import stream from "stream";
import uuidByString from "uuid-by-string";
import {Ctx} from "../../../../clients/context.js";
import {getDatasetSpecs} from "../../../../datasets/dataset-specs.js";
import {formatItemText} from "../../../../datasets/dataset-parser.js";
import {generateItem} from "../../../../datasets/dataset-generator.js";
import {cleanName} from "../../../../utils.js";

export default async function handler(req, res) { 
    // const match = req.url.match(/^\/api\/data\/([^\/]*)\/([^\/]*)/);
    // let type = match ? match[1].replace(/s$/, '') : '';
    // let name = match ? match[2] : '';

    // A safer way to get the exact URL params
    // Also by accessing the query params no need to decode URI
    const {contents, name} = req.query;
    const type = contents ? contents.replace(/s$/, "") : "";
    let setName = name || "";

    // name = decodeURIComponent(name);
    setName = cleanName(setName);

    const c = new Ctx();
    const title = `${type}/${setName}`;
    const id = uuidByString(title);
    const query = await c.databaseClient.getByName("Content", title);

    console.log("QUERY RESPONSE: ", query, title);

    if (query) {
        const {content, title, type} = query;
        res.json(query);
    } else {
        const c = new Ctx();
        const [datasetSpecs, generatedItem] = await Promise.all([
            getDatasetSpecs(),
            generateItem(type, setName),
        ]);
        const datasetSpec = datasetSpecs.find(ds => ds.type === type);
        const itemText = formatItemText(generatedItem, datasetSpec);

        const content = `\
${itemText}
`;      
        await c.databaseClient.setByName(
            "Content",
            title,
            content,
        );

        console.log("Data Saved")

        res.json({
            id,
            type,
            title,
            content,
        });
    }
}