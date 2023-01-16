import stream from "stream";
import { Ctx } from "../../../../clients/context.js";
import { getDatasetSpecs } from "../../../../datasets/dataset-specs.js";
import { cleanName } from "../../../../utils.js";
import { generateCard } from "../../../../media/cards/card-generator.js";

//

const globalImagePrompt = `trending on ArtStation`;

//

const CardImage = async (req, res) => {
    const props = await CardImage.getInitialProps({ req });
    if (props) {
        const { imgUrl } = props;
        const proxyRes = await fetch(imgUrl);
        // proxy the status and headers
        res.status(proxyRes.status);
        for (const [key, value] of proxyRes.headers.entries()) {
            res.setHeader(key, value);
        }
        // pipe the response
        // console.log('got body', proxyRes.body);
        stream.Readable.fromWeb(proxyRes.body).pipe(res);
    } else {
        res.send(404);
    }
};

CardImage.getInitialProps = async (ctx) => {
    const { req } = ctx;
    // Clean url from passed values after ?
    const reqUrlClean = req.url.replace(/\?.*$/, "");
    const match = reqUrlClean.match(/^\/api\/cards\/([^\/]*)\/([^\/]*)\.png$/);
    // Moved the generate image to a reusable function
    // so it can be called to re-generate the image as well
    const generateNewImage = async (
        datasetSpec,
        description,
        imageName,
        imageTitle
    ) => {
        const c = new Ctx();
        const { imagePrompt } = datasetSpec;

        const generateCharacterImage = generateCard({
            modelName: null,
            // suffix: 'anime style video game character concept, full body',
            suffix: `${imagePrompt}, ${globalImagePrompt}`,
            // seed: [512, 512, 64, 128, 1, 256],
        });
        let file = await generateCharacterImage(description); // XXX make this based on the type

        file.name = imageName;
        const hash = await c.storageClient.uploadFile(file);

        await c.databaseClient.setByName("IpfsData", imageTitle, hash);

        const imgUrl = c.storageClient.getUrl(hash, file.name);

        return {
            imgUrl,
        };
    };

    let type = match[1];
    type = decodeURIComponent(type);
    const singleType = type.replace(/s$/, "");
    type = cleanName(type);
    let description = match[2];
    description = decodeURIComponent(description);
    description = cleanName(description);

    const datasetSpecs = await getDatasetSpecs();
    const datasetSpec = datasetSpecs.find((spec) => spec.type === singleType);

    if (datasetSpec) {
        const imageTitle = `images/${type}/${description}`;
        const imageName = `${description}.svg`;
        return await generateNewImage(
            datasetSpec,
            description,
            imageName,
            imageTitle
        );
    } else {
        return null;
    }
};
export default CardImage;
