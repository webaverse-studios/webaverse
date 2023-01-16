export const makePromise = () => {
    let resolve, reject;
    const promise = new Promise((a, b) => {
        resolve = a;
        reject = b;
    });
    promise.resolve = resolve;
    promise.reject = reject;
    return promise;
};
export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const capitalizeAllWords = (s) => {
    let words = s.split(/\s+/);
    words = words.map((word) => capitalize(word));
    return words.join(" ");
};
export const ensureUrl = async (url) => {
    const numRetries = 5;
    for (let i = 0; i < numRetries; i++) {
        const res = await fetch(url);
        if (res.ok) {
            return;
        } else {
            if (res.status === 408) {
                continue;
            } else {
                throw new Error(`invalid status code: ${res.status}`);
            }
        }
    }
};
export const cleanName = (name) => {
    name = name.replace(/_/g, " ");
    name = capitalizeAllWords(name);
    return name;
};
export const isAllCaps = (name) => {
    return !/[A-Z]/.test(name) || /^(?:[A-Z]+)$/.test(name);
};

// Format Images
export const formatImages = async (md, type) => {
    md = md.replace(/\!\[([^\]]*?)\]\(([^\)]*?)\)/g, (all, title, url) => {
        const match = title.match(/^([\s\S]*?)(\|[\s\S]*?)?$/);
        if (match) {
            title = match[1].trim();
            url = match[2] ? match[2].trim() : title;
            url = url.replaceAll("|","").trim();
            if (url) {
                return `![${title}](/api/images/${type}s/${encodeURIComponent(
                    url
                )}.png)`;
            } else {
                return null;
            }
        } else {
            return all;
        }
    });
    return md;
};

// Format URLs
export const formatUrls = async (md) => {
    md = md.replace(
        /(\!?)\[([\s\S]+?)\]\(([\s\S]+?)\)/g,
        (all, q, title, url) => {
            if (q) {
                return all;
            }
            return `[${title}](${encodeURI(url)})`;
        }
    );
    return md;
};

// Format Images For JONS format
export const getImagesJSON = async (md, type) => {
    let galleryArray = [];

    const matc2 = md.match(/^([\s\S]*?)(\|[\s\S]*?)?$/);
    // console.log(matc2)
    md = md.replace(/\!\[([^\]]*?)\]\(([^\)]*?)\)/g, (all, title, url) => {
        const match = title.match(/^([\s\S]*?)(\|[\s\S]*?)?$/);
        if (match) {
            title = match[1].trim();
            // console.log(match)
            url = match[2] ? match[2].trim() : title;
            url = url.replaceAll("|","").trim();
            if (url) {
                galleryArray.push({
                    // image: `![${title}](/api/images/${type}s/${encodeURIComponent(
                     //   url
                    // )}.png)`,
                    title: title,
                    prompt: url || title,
                    token: "",
                    format: "png",
                    url: "",
                });
            } else {
                return null;
            }
        } else {
            return all;
        }
    });
    return galleryArray;
};

// Format parsed data to externally usable JSON

export const formatParsedDataToJSON = async (rawJSON, type) => {
    let JSON = rawJSON;
    if (JSON?.Name) {
        // FORMAT STATS
        if (JSON?.Stats) {
            let statsJson = {};
            await JSON.Stats.split(",").map((element) => {
                let trimmed = element.trim();
                let stat = trimmed.split(" ");
                statsJson[stat[0]] = stat[1];
            });
            JSON.Stats = statsJson;
        }
        // FORMAT DECOMPOSITION
        if (JSON?.Decomposition) {
            let decompositionJson = {};
            await JSON.Decomposition.split(",").map((element) => {
                let trimmed = element.trim();
                let stat = trimmed.split(" ");
                decompositionJson[stat[0]] = stat[1];
            });
            JSON.Decomposition = decompositionJson;
        }
        // FORMAT ORES
        if (JSON?.Ores) {
            let oresJson = {};
            await JSON.Ores.split(",").map((element) => {
                let trimmed = element.trim();
                let stat = trimmed.split(" ");
                oresJson[stat[0]] = stat[1];
            });
            JSON.Ores = oresJson;
        }
        // FORMAT IMAGE
        if (JSON?.Image) {
            const match = JSON.Image.match(/^([\s\S]*?)(\|[\s\S]*?)?$/);
            let title = match[1].trim();
            let url = match[2] ? match[2].trim() : title;
            url = url.replaceAll("|","").trim();

            JSON.Image = {
                // image: `![${title}](/api/images/${type}s/${encodeURIComponent(
                 //   url
                // )}.png)`,
                title: title,
                prompt: url || title,
                token: "",
                format: "png",
                url: "",
            }
            
        }
        // FORMAT GALLERY
        if(JSON['Image Gallery']) {
            JSON['Image Gallery'] = await getImagesJSON(JSON['Image Gallery'], type);
        }
    }
    return JSON;
};

// Format Sections

// Section Title Separator
const sectionSeperator = "##";
// Title & Description Separator by first ":" in the string
const titleDescriptionSeperator = /:(.*)/s;

export const getSections = async (content) => {
    const sections = [];
    const sectionsArray = content.split(sectionSeperator);
    await sectionsArray.map((section) => {
        if (section) {
            let sectionItem = {
                title: section.split(titleDescriptionSeperator)[0].trim(),
                content: section.split(titleDescriptionSeperator)[1].trim(),
            };
            sections.push(sectionItem);
        }
    });
    return sections;
};

// Fetch Gallery Images as an Array
export const getGalleryArray = async (content) => {
    const gallery = [];
    const imagesArray = content.match(/\!\[([^\]]*?)\]\(([^\)]*?)\)/g);
    if (imagesArray) {
        await imagesArray.map((image) => {
            const title = image.match(/(?<=\[).+?(?=\])/g)[0];
            const url = image.match(/(?<=\().+?(?=\))/g)[0];
            let galleryItem = {
                caption: title,
                url: url,
            };
            if (url) {
                gallery.push(galleryItem);
            }
        });
    }
    return gallery;
};

export function mod(v, n) {
    return ((v % n) + n) % n;
}