import { stableDiffusionUrl } from "../../constants/endpoints-constants.js";
import { parse } from "node-html-parser";

export const generateCard =
    ({ modelName, suffix, seed }) =>
    async (description) => {
        if (!seed) {
            const s = `${description}, ${suffix}`;
            const u = `${stableDiffusionUrl}/image?s=${encodeURIComponent(s)}${
                modelName ? `&model=${modelName}` : ""
            }`;
            
            //const file = await fetch(
            //    `https://local.webaverse.com:4444/cards/wiki_card_template_1.svg`
           // );

            const DOMSVG = await fetch(
                `https://local.webaverse.com:4444/cards/wiki_card_template_1.svg`
            )
                .then((res) => res.text())
                .then((res) => {
                let svgDom = parse(res, "image/svg+xml");
                svgDom.getElementById("name").childNodes[0]._rawText = description;
                svgDom.getElementById("manaValue").childNodes[0]._rawText = "33";
                svgDom.getElementById("manaValue2").childNodes[0]._rawText = "33";
                svgDom.getElementById("healthValue").childNodes[0]._rawText = "75";
                svgDom.getElementById("healthValue2").childNodes[0]._rawText = "75";
                return svgDom;
                });


                const file = await fetch(
                    `https://local.webaverse.com:4444/cards/wiki_card_template_1.svg`
                );

            console.log("IMAAAAAAAAAAGE", file);

            
            // console.log('generate image url 2', {u, status: res.status});
            if (file.ok) {
                if (DOMSVG) {
                    const file = new Blob([DOMSVG], {
                        type: "image/svg+xml",
                    });
                    return file;
                } else {
                    throw new Error(`generated empty image`);
                }
            } else {
                throw new Error(`invalid status: ${file.status}`);
            }
        } else {
            throw new Error(`seed based generation not implemented`);
        }
    };
