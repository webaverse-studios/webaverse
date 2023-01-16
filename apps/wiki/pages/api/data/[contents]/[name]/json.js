// import stream from "stream";
import { Ctx } from "../../../../../clients/context.js";
import uuidByString from "uuid-by-string";
import {
    cleanName,
    getImagesJSON,
    formatParsedDataToJSON,
} from "../../../../../utils.js";
import { parseDatasetItems } from "../../../../../datasets/dataset-parser.js";
import { formatItemText } from "../../../../../datasets/dataset-parser.js";
import { generateItem } from "../../../../../datasets/dataset-generator.js";
import { getDatasetSpecs } from "../../../../../datasets/dataset-specs.js";

const region = process.env.AWS_REGION || "us-west-2";
const bucketName =
    process.env.AWS_BUCKET_NAME_WEBAVERSE || "wiki.webaverse.com";
const urlBase =
    process.env.AWS_S3_URL_BASE_WEBAVERSE ||
    `https://s3.${region}.amazonaws.com`;

export default async function handler(req, res) {
    // const match = req.url.match(/^\/api\/data\/([^\/]*)\/([^\/]*)/);
    // let type = match ? match[1].replace(/s$/, '') : '';
    // let name = match ? match[2] : '';

    // A safer way to get the exact URL params
    // Also by accessing the query params no need to decode URI
    const { contents, name } = req.query;
    let type = contents ? contents.replace(/s$/, "") : "";
    let setName = name ? name : "";

    //name = decodeURIComponent(name);
    setName = cleanName(setName);

    const c = new Ctx();
    const title = `${type}/${setName}`;
    const id = uuidByString(title);
    const query = await c.databaseClient.getByName("Content", title);

    if (query) {
        const { content: text } = query;
        const datasetSpecs = await getDatasetSpecs();
        const datasetSpec = datasetSpecs.find((ds) => ds.type === type);
        const items = parseDatasetItems(text, datasetSpec);
        if (items.length > 0) {
            let jsonData = await formatParsedDataToJSON(items[0], type);
            res.json({
                title: name,
                type: type,
                content: jsonData,
                error: null,
            });
        } else {
            res.json({
                data: null,
                error: "Failed to parse item",
            });
        }
    } else {
        const c = new Ctx();
        const [datasetSpecs, generatedItem] = await Promise.all([
            getDatasetSpecs(),
            generateItem(type, setName),
        ]);
        const datasetSpec = datasetSpecs.find((ds) => ds.type === type);
        const itemText = formatItemText(generatedItem, datasetSpec);
        const content = `\
${itemText}
`;
        await c.databaseClient.setByName("Content", title, content);
        const items = parseDatasetItems(content, datasetSpec);
        if (items.length > 0) {
            let jsonData = await formatParsedDataToJSON(items[0]);
            res.json({
                title: name,
                type: type,
                content: jsonData,
                error: null,
            });
        } else {
            res.json({
                data: null,
                error: "Failed to parse item",
            });
        }
    }
}
