// import {makePromise} from "../../../../utils.js";
import {ImageAiServer} from "../../../../src/clients/image-client.js";

//

const server = new ImageAiServer();

const ImageAi = async (req, res) => {
    await server.handleRequest(req, res);
};

export default ImageAi;

export const config = {
    api: {
        bodyParser: false,
    },
};