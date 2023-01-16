import React, { useState, useEffect, useContext } from "react";
import CustomButton from "../../src/components/custom-button";
import { ImageLoader } from "../../src/components/image-loader/ImageLoader";
import styles from "./WriterTools.module.css";

async function generateImage(prompt) {
    const response = await fetch("https://stable-diffusion.webaverse.com/run/txt2img", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            prompt,
            prompt,
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

      return `https://stable-diffusion.webaverse.com/file=${response.name}`;
}

export const Character = (props) => {
    // States For saving dataset values
    // Do not change
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [charClass, setCharClass] = useState("");
    const [stats, setStats] = useState({
        atk: 0,
        def: 0,
        vit: 0,
        spr: 0,
        dex: 0,
        lck: 0,
    });
    const [alignment, setAlignment] = useState("");
    const [quotes, setQuotes] = useState([]);
    const [image, setImage] = useState({
        title: "",
        prompt: ""
    });
    const [imageGallery, setImageGallery] = useState([]);
    const [has, setHas] = useState([]);
    const [abilities, setAbilities] = useState([]);
    const [limitBreak, setLimitBreak] = useState("");
    const [biography, setBiography] = useState("");
    const [appearance, setAppearance] = useState("");
    const [personality, setPersonality] = useState("");
    const [homespace, setHomespace] = useState("");
    const [relationships, setRelationships] = useState("");
    const [trivia, setTrivia] = useState([]);

    const [content, setContent] = useState();

    const [triggerChange, setTriggerChange] = useState(true);

    useEffect(() => {
        let formatedQuotes = "";
        for (const k in quotes) {
            const v = quotes[k];
            if (v) {
                formatedQuotes += `- ${v}\n`;
            }
        }

        let formatedHas = "";
        for (const k in has) {
            const v = has[k];
            if (v) {
                formatedHas += `- [${v}](/items/${v})\n`;
            }
        }

        let formatedAbilities = "";
        for (const k in abilities) {
            const v = abilities[k];
            if (v) {
                formatedAbilities += `- [${v}](/abilities/${v})\n`;
            }
        }

        let formatedTrivia = "";
        for (const k in trivia) {
            const v = trivia[k];
            if (v) {
                formatedTrivia += `- ${v}\n`;
            }
        }

        let formatedGalley = "";
        for (const k in imageGallery) {
            const v = imageGallery[k];
            if (v) {
                formatedTrivia += `- ![${v.title}|${v.prompt}]()\n`;
            }
        }

        const content = `
## Name:
${name}
## Description:
${description}
## Class:
${charClass}
## Stats:
ATK: ${stats?.atk}, DEF: ${stats?.def}, VIT: ${stats?.vit}, SPR: ${stats?.spr}, DEX: ${stats?.dex}, LCK: ${stats?.lck}
## Alignment:
${alignment}
## Quotes:
${formatedQuotes}
## Image:
- ![${image.title} | ${image.prompt}]()
## Image Gallery:
${formatedGalley}
## Has:
${formatedHas}
## Abilities:
${formatedAbilities}
## Limit Break:
${limitBreak}
## Biography:
${biography}
## Appearance:
${appearance}
## Personality:
${personality}
## Homespace:
${homespace}
## Relationships:
${relationships}
## Trivia:
${formatedTrivia}
`;
        setContent(content);
        setTriggerChange(false);

        //console.log(content);
    }, [
        name,
        description,
        charClass,
        stats,
        alignment,
        quotes,
        image,
        imageGallery,
        has,
        abilities,
        limitBreak,
        biography,
        appearance,
        personality,
        homespace,
        relationships,
        trivia,
    ]);

    const handleStatsChange = (e) => {
        setStats({
            ...stats,
            [e.target.id]: e.target.value,
        });
    };

    const hadleQuoteValueChange = (e) => {
        let index = e.target.id;
        const newQuotes = [...quotes];
        newQuotes[index] = e.target.value;
        setQuotes(newQuotes);
    };

    const addQuote = () => {
        const quote = "";
        setQuotes((current) => [...current, quote]);
    };

    const deleteQuote = (index) => {
        const newQuotes = quotes.filter((item, i) => i !== index);
        setQuotes(newQuotes);
    };

    const hadleHasValueChange = (e) => {
        let index = e.target.id;
        const newHas = [...has];
        newHas[index] = e.target.value;
        setHas(newHas);
    };

    const addHasItem = () => {
        const hasItem = "";
        setHas((current) => [...current, hasItem]);
    };

    const deleteHasItem = (index) => {
        const newHas = has.filter((item, i) => i !== index);
        setHas(newHas);
    };

    const hadleAbilityValueChange = (e) => {
        let index = e.target.id;
        const newAbility = [...abilities];
        newAbility[index] = e.target.value;
        setAbilities(newAbility);
    };

    const addAbility = () => {
        const ability = "";
        setAbilities((current) => [...current, ability]);
    };

    const deleteAbility = (index) => {
        const newAbilities = abilities.filter((item, i) => i !== index);
        setAbilities(newAbilities);
    };

    const hadleTriviaValueChange = (e) => {
        let index = e.target.id;
        const newTrivia = [...trivia];
        newTrivia[index] = e.target.value;
        setTrivia(newTrivia);
    };

    const addTrivia = () => {
        const triviaItem = "";
        setTrivia((current) => [...current, triviaItem]);
    };

    const deleteTrivia = (index) => {
        const newTrivia = trivia.filter((item, i) => i !== index);
        setTrivia(newTrivia);
    };


    const hadleImageValueChange = (e,key) => {
        let index = e.target.id;
        const newImage = [...imageGallery];
        console.log(newImage)
        newImage[index] = { ...newImage[index], [key]: e.target.value };
        setImageGallery(newImage);
    };

    const hadleImageChange = (e,key) => {
        setImage({ ...image, [key]: e.target.value });
    };

    const addImage = () => {
        const galleryItem = {
            title: "",
            prompt: ""
        };
        setImageGallery((current) => [...current, galleryItem]);
    };

    const deleteImage = (index) => {
        const newGallery = imageGallery.filter((item, i) => i !== index);
        setImageGallery(newGallery);
    };

    const setMainImagePreview = () => {
        console.log(image.prompt)
        generateImage(image.prompt).then(res => {
            setImage({ ...image, preview: res });
        })
    };

    const setGalPreview = (index) => {
        let newImage = [...imageGallery];
        generateImage(newImage[index].prompt).then(res => {
            newImage[index] = { ...newImage[index], preview: res };
        })
        console.log(newImage[index]);
        setImageGallery(newImage);
    };

    const [tab, setTab] = useState(1);

    return (
        <div>
            <h2 className={styles.tabs}>
                <span
                    onClick={() => setTab(1)}
                    className={tab === 1 && styles.active}
                >
                    Edit
                </span>
                <span
                    onClick={() => setTab(2)}
                    className={tab === 2 && styles.active}
                >
                    Preview
                </span>
                <span
                    onClick={() => setTab(3)}
                    className={tab === 3 && styles.active}
                >
                    Dataset
                </span>
            </h2>
            <div className={styles.rightContent}></div>
            <div className={styles.leftContent}>
                {tab === 1 && (
                    <div className={styles.editContent}>
                        <h2>Name</h2>
                        <label className={styles.mainLabel}>
                            Character's full name:
                        </label>
                        <input
                            onChange={(e) => setName(e.target.value)}
                            value={name}
                        />
                        <h2>Description</h2>
                        <label className={styles.mainLabel}>
                            Paragraphs describing the character:
                        </label>
                        <textarea
                            onChange={(e) => setDescription(e.target.value)}
                            value={description}
                        />
                        <h2> Class</h2>
                        <label className={styles.mainLabel}>
                            Character's class/job/role:
                        </label>
                        <input
                            onChange={(e) => setCharClass(e.target.value)}
                            value={charClass}
                        />
                        <h2> Alignment</h2>
                        <label className={styles.mainLabel}>
                            Dungeaon & Dragons style moral/ethical alignment,
                            like Chaotic Neutral:
                        </label>
                        <input
                            onChange={(e) => setAlignment(e.target.value)}
                            value={alignment}
                        />
                        <h2> Stats</h2>
                        <label className={styles.mainLabel}>
                            Character's stats:
                        </label>
                        <div className={styles.statsFormWrap}>
                            <div>
                                <label>Attack:</label>
                                <input
                                    type="number"
                                    id="atk"
                                    onChange={(e) => handleStatsChange(e)}
                                    value={stats?.atk}
                                />
                            </div>
                            <div>
                                <label>Defense:</label>
                                <input
                                    type="number"
                                    id="def"
                                    onChange={(e) => handleStatsChange(e)}
                                    value={stats?.def}
                                />
                            </div>
                            <div>
                                <label>Vitality:</label>
                                <input
                                    type="number"
                                    id="vit"
                                    onChange={(e) => handleStatsChange(e)}
                                    value={stats?.vit}
                                />
                            </div>
                            <div>
                                <label>Sprint:</label>
                                <input
                                    type="number"
                                    id="spr"
                                    onChange={(e) => handleStatsChange(e)}
                                    value={stats?.spr}
                                />
                            </div>
                            <div>
                                <label>Dexterity:</label>
                                <input
                                    type="number"
                                    id="dex"
                                    onChange={(e) => handleStatsChange(e)}
                                    value={stats?.dex}
                                />
                            </div>
                            <div>
                                <label>Luck:</label>
                                <input
                                    type="number"
                                    id="lck"
                                    onChange={(e) => handleStatsChange(e)}
                                    value={stats?.lck}
                                />
                            </div>
                        </div>
                        <h2>Image</h2>
                        <label className={styles.mainLabel}>
                            Character's main/featured image:
                        </label>
                        <div className={styles.imageFormWrap}>
                            <div className={styles.info}>
                                <div className={styles.imageTitle}>
                                    <label>Title:</label>
                                    <input
                                        id="title"
                                        onChange={(e) => hadleImageChange(e, "title")}
                                        value={image?.title}
                                    />
                                </div>
                                <div className={styles.imageDesc}>
                                    <label>Description/Prompt:</label>
                                    <textarea
                                        id="prompt"
                                        onChange={(e) => hadleImageChange(e,"prompt")}
                                        value={image?.description}
                                    />
                                </div>
                            </div>
                            <div className={styles.preview}>
                                <label className={styles.generateButton} onClick={() => setMainImagePreview()}>Generate Preview</label>
                                <div className={styles.generatePreview}>
                                { image?.preview && (
                                    <ImageLoader url={image.preview} />
                                )}
                                </div>
                            </div>
                        </div>
                        <h2> Image Gallery</h2>
                        <label className={styles.mainLabel}>
                            Character's image gallery:
                        </label>
                        <div className={styles.galleryWrap}>
                            <div>
                                {imageGallery &&
                                    imageGallery.map((image, index) => {
                                        return (
                                            <div className={styles.imageFormWrap} key={index}>
                                                <div className={styles.info}>
                                                    <div className={styles.imageTitle}>
                                                        <label>Title:</label>
                                                        <input
                                                            id={index}
                                                            onChange={(e) => hadleImageValueChange(e,"title")}
                                                            value={image?.title}
                                                        />
                                                    </div>
                                                    <div className={styles.imageDesc}>
                                                        <label>Description/Prompt:</label>
                                                        <textarea
                                                            id={index}
                                                            onChange={(e) => hadleImageValueChange(e,"prompt")}
                                                            value={image?.prompt}
                                                        />
                                                    </div>
                                                </div>
                                                <div className={styles.preview}>
                                                <label className={styles.generateButton} onClick={() => setGalPreview(index)}>Generate Preview</label>
                                                    <div className={styles.generatePreview}>
                                                        { image?.preview && (
                                                        <ImageLoader url={image?.preview} rerollable={false} />
                                                        )}
                                                    </div>
                                                </div>
                                                <CustomButton
                                                    type="icon"
                                                    theme="dark"
                                                    icon="close"
                                                    size={24}
                                                    className={styles.remove}
                                                    onClick={() =>
                                                        deleteImage(index)
                                                    }
                                                />
                                            </div>
                                        );
                                    })}
                            </div>
                            <button onClick={() => addImage()}>
                                + Add Image
                            </button>
                        </div>

                        <h2> Quotes</h2>
                        <label className={styles.mainLabel}>
                            List of important quotes the character has said:
                        </label>
                        <div className={styles.quoteList}>
                            <div>
                                {quotes &&
                                    quotes.map((quote, index) => {
                                        return (
                                            <div
                                                className={styles.quoteFormItem}
                                                key={index}
                                            >
                                                <label>Quote:</label>
                                                <input
                                                    onChange={(e) =>
                                                        hadleQuoteValueChange(e)
                                                    }
                                                    value={quote}
                                                    id={index}
                                                />
                                                <CustomButton
                                                    type="icon"
                                                    theme="dark"
                                                    icon="close"
                                                    size={24}
                                                    className={styles.remove}
                                                    onClick={() =>
                                                        deleteQuote(index)
                                                    }
                                                />
                                            </div>
                                        );
                                    })}
                            </div>
                            <button onClick={() => addQuote()}>
                                + Add Quote
                            </button>
                        </div>
                        <h2> Has</h2>
                        <label className={styles.mainLabel}>
                            Items the character has in their inventory:
                        </label>
                        <div className={styles.quoteList}>
                            <div>
                                {has &&
                                    has.map((item, index) => {
                                        return (
                                            <div
                                                className={styles.quoteFormItem}
                                                key={index}
                                            >
                                                <label>Has Item:</label>
                                                <input
                                                    onChange={(e) =>
                                                        hadleHasValueChange(e)
                                                    }
                                                    value={item}
                                                    id={index}
                                                />
                                                <CustomButton
                                                    type="icon"
                                                    theme="dark"
                                                    icon="close"
                                                    size={24}
                                                    className={styles.remove}
                                                    onClick={() =>
                                                        deleteHasItem(index)
                                                    }
                                                />
                                            </div>
                                        );
                                    })}
                            </div>
                            <button onClick={() => addHasItem()}>
                                + Add Item
                            </button>
                        </div>
                        <h2> Abilities</h2>
                        <label className={styles.mainLabel}>
                            List of character's abilities:
                        </label>
                        <div className={styles.quoteList}>
                            <div>
                                {abilities &&
                                    abilities.map((item, index) => {
                                        return (
                                            <div
                                                className={styles.quoteFormItem}
                                                key={index}
                                            >
                                                <label>Ability:</label>
                                                <input
                                                    onChange={(e) =>
                                                        hadleAbilityValueChange(
                                                            e
                                                        )
                                                    }
                                                    value={item}
                                                    id={index}
                                                />
                                                <CustomButton
                                                    type="icon"
                                                    theme="dark"
                                                    icon="close"
                                                    size={24}
                                                    className={styles.remove}
                                                    onClick={() =>
                                                        deleteAbility(index)
                                                    }
                                                />
                                            </div>
                                        );
                                    })}
                            </div>
                            <button onClick={() => addAbility()}>
                                + Add Ability
                            </button>
                        </div>
                        <h2> Trivia</h2>
                        <label className={styles.mainLabel}>
                            Random trivia about the character:
                        </label>
                        <div className={styles.quoteList}>
                            <div>
                                {trivia &&
                                    trivia.map((item, index) => {
                                        return (
                                            <div
                                                className={styles.quoteFormItem}
                                                key={index}
                                            >
                                                <label>Trivia:</label>
                                                <input
                                                    onChange={(e) =>
                                                        hadleTriviaValueChange(
                                                            e
                                                        )
                                                    }
                                                    value={item}
                                                    id={index}
                                                />
                                                <CustomButton
                                                    type="icon"
                                                    theme="dark"
                                                    icon="close"
                                                    size={24}
                                                    className={styles.remove}
                                                    onClick={() =>
                                                        deleteTrivia(index)
                                                    }
                                                />
                                            </div>
                                        );
                                    })}
                            </div>
                            <button onClick={() => addTrivia()}>
                                + Add Trivia
                            </button>
                        </div>
                        <h2> Limit Break</h2>
                        <label className={styles.mainLabel}>
                            Character's limit break ability:
                        </label>
                        <textarea
                            onChange={(e) => setLimitBreak(e.target.value)}
                            value={limitBreak}
                        />
                        <h2> Biography</h2>
                        <label className={styles.mainLabel}>
                            Character's long-form biography:
                        </label>
                        <textarea
                            onChange={(e) => setBiography(e.target.value)}
                            value={biography}
                        />
                        <h2> Appearance</h2>
                        <label className={styles.mainLabel}>
                            Visual description of the character:
                        </label>
                        <textarea
                            onChange={(e) => setAppearance(e.target.value)}
                            value={appearance}
                        />
                        <h2> Personality</h2>
                        <label className={styles.mainLabel}>
                            Description of the character's personality:
                        </label>
                        <textarea
                            onChange={(e) => setPersonality(e.target.value)}
                            value={personality}
                        />
                        <h2> Homespace</h2>
                        <label className={styles.mainLabel}>
                            Description where the character lives:
                        </label>
                        <textarea
                            onChange={(e) => setHomespace(e.target.value)}
                            value={homespace}
                        />
                        <h2> Relationships</h2>
                        <label className={styles.mainLabel}>
                            How this character relates to other characters:
                        </label>
                        <textarea
                            onChange={(e) => setRelationships(e.target.value)}
                            value={relationships}
                        />
                    </div>
                )}
                {tab === 3 && (
                    <div className={styles.rawView}>
                        <pre>{content}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};
