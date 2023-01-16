// import stream from "stream";
import uuidByString from "uuid-by-string";
import { Ctx } from "../../../../../clients/context.js";
import { getDatasetSpecs } from "../../../../../datasets/dataset-specs.js";
import { formatItemText } from "../../../../../datasets/dataset-parser.js";
import { generateItem } from "../../../../../datasets/dataset-generator.js";
import { cleanName } from "../../../../../utils.js";

export default async function handler(req, res) {
    const { contents, name } = req.query;
    let type = contents ? contents.replace(/s$/, "") : "";
    let setName = name ? name : "";

    setName = cleanName(setName);

    const c = new Ctx();
    const title = `${type}/${setName}`;
    const id = uuidByString(title);

    const [datasetSpecs, generatedItem] = await Promise.all([
        getDatasetSpecs(),
        generateItem(type, setName),
    ]);
    const datasetSpec = datasetSpecs.find((ds) => ds.type === type);
    const itemText = formatItemText(generatedItem, datasetSpec);

    const content = `\
${itemText}
`;
    res.json({
        id,
        title,
        type,
        content,
    });
}
