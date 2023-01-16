import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();
import fs from "fs";
import {
  generateLocation,
  generateCharacter,
  generateObject,
  generateLore,
  generateObjectComment,
  generateReaction,
  generateBanter,
  generateExposition,
  generateRPGDialogue,
  generateCutscene,
  generateQuest,
  generateLocationComment,
  generateSelectCharacter,
  generateChatMessage,
  generateDialogueOptions,
  generateCharacterIntro,
  generateBattleIntroduction,
  makeBattleIntroductionPrompt,
  makeCutscenePrompt,
  makeBanterPrompt,
  makeExpositionPrompt,
  makeSelectCharacterPrompt,
  makeSelectCharacterStop,
  makeCharacterIntroStop,
  makeBattleIntroductionStop,
  makeCutsceneStop,
  makeBanterStop,
  makeRPGDialogueStop,
  makeChatPrompt,
  makeChatStop,
  makeCommentPrompt,
  makeLocationPrompt,
  makeCharacterPrompt,
  makeObjectPrompt,
  makeCharacterIntroPrompt,
  makeRPGDialoguePrompt,
  makeCommentStop,
  makeCharacterStop,
  makeObjectStop,
  makeExpositionStop,
  makeLocationStop,
  makeReactionPrompt,
  makeReactionStop,
  generateNPCComment,
  generateMobComment,
  makeOptionsPrompt,
  makeLorePrompt,
  makeLoreStop,
  makeLoreFilePrompt,
  generateLoreFile,
  exampleLoreFiles,
  makeQuestPrompt,
  makeQuestStop,
} from "./lore-model.js";

const args = process.argv;
// if the first arg contains 'sk-' then it's the openai key
// otherwise it's the name of the test to run

const test =
  (!args[2]?.includes("sk-") && args[2]) ||
  (!args[3]?.includes("sk-") && args[3]) ||
  "all";

const testData = {
  locations: [
    {
      name: "Scillia's Treehouse",
      description: `\
It's more of a floating island but they call it a tree house. Inside the treehouse lives a monster, the Lisk, which is an advanced AI from far up the Street.`,
    },
    {
      name: "Volcano",
      description: `\
It's so dark and hot around, your bones will melt if you approach a lot`,
    },
  ],
  npcs: [
    {
      name: `bricks`,
      description: `(13/M dealer. He mostly deals things that are not drugs, like information and AI seeds.): Toxins are the Devil's Food! But sometimes they can be good for you, if you know what I mean? That's a drug reference, but I wouldn't expect you to get that unless you were on drugs. By the way you want some?
      (onselect: I don't do drugs, but I know someone who does. Let me introduce you to my friend Bricks.)`,
      Inventory: [
        {
          name: `sword`,
          description: `A rusty old sword.`,
          metadata: `Damage: 20, Element: fire`,
        },
      ],
    },
    {
      name: `artemis`,
      description: `(15/F pet breeder. She synthesizes pet animals by combining their neural genes.): Do you ever wonder why we keep pets on leashes? I mean they are technically AIs, so we could reprogram them to not need leashes. But someone somewhere decided that leashes were the prettier choice. Life is nice. (onselect: Bless the hearts of the birds, because they paint the sky.)`,
      Inventory: [
        {
          name: `pistol`,
          description: `Basic pistol.`,
        },
      ],
    },
    {
      name: `bailey`,
      description: `(13/F black witch. She is smart, reserved, and studious, but has a dark side to her.): Listen up, if you need quality potions, I'm your ma'am, ma'am. Yes I may be a witch but that doesn't mean I'm not a lady. I'll take your money and turn it into something magical. Just don't anger me, or you'll be a tree. (onselect: Witchcraft is not a sin. It's a science.)`,
      Inventory: [
        {
          name: `bow`,
          description: `A basic bow. It looks like something rambo would use.`,
        },
      ],
    },
  ],
  party: [
    {
      name: `scillia`,
      description: `Her nickname is Scilly or SLY. 13/F drop hunter. She is an adventurer, swordfighter and fan of potions. She is exceptionally skilled and can go Super Saiyan.`,
      Inventory: [
        {
          name: `sword`,
          description: `A rusty old sword.`,
          metadata: `Damage: 20, Element: fire`,
        },
      ],
    },
    {
      name: `drake`,
      description: `His nickname is DRK. 15/M hacker. Loves guns. Likes plotting new hacks. He has the best equipment and is always ready for a fight.`,
      Inventory: [
        {
          name: `pistol`,
          description: `Basic pistol.`,
        },
      ],
    },
    {
      name: `hyacinth`,
      description: `Also known as Hya. 15/F beast tamer. Influencer famous for her pets, and friend of Scillia's. She is really bad in school but the richest one in the group.`,
      Inventory: [
        {
          name: `bow`,
          description: `A basic bow. It looks like something rambo would use.`,
        },
      ],
    },
  ],
  objects: [
    {
      name: `chair`,
      description: `A silver chair from long ago.`,
      metadata: `Color: #FF8080`,
    },
    {
      name: `mirror`,
      description: `A shiny new mirror. I bet my outfit looks great in it!`,
    },
    {
      name: `desk`,
      description: `A desk. Not much on it`,
    },
    {
      name: `laptop`,
      description: `A laptop. It's a Macbook Pro.`,
    },
  ],
  mobs: [
    {
      name: `zombie`,
      description: `Standard slow zombie. Usually travels in a horde.`,
    },
    {
      name: `skeleton`,
      description: `Standard skeleton, wielding a sword and broken wooden shield.`,
    },
    {
      name: `spider`,
      description: `A giant spider. Probably poisonous.`,
    },
    {
      name: `liskborn`,
      description: `The Lisk says its nothing but the neighbors are starting to complain about the pests.`,
    },
    {
      name: `witch`,
      description: `A witch. She is a powerful witch. Probably best not to mess with her.`,
    },
  ],
  messages: [
    {
      speaker: "scillia",
      message: "Hey, I found a sword. It looks rusty but it might be useful.",
    },
  ],
};

// get openai key from process.env or args[0]
function getOpenAIKey() {
  const key =
    process?.env?.OPENAI_KEY ||
    (args[2]?.includes("sk-") && args[2]) ||
    (args[3]?.includes("sk-") && args[3]);
  if (!key || key.length <= 0) {
    return console.error("No openai key found");
  }
  return key;
}

function makeGenerateFn() {
  async function query(openai_api_key, params = {}) {
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + String(openai_api_key),
      },
      body: JSON.stringify(params),
    };
    try {
      const response = await fetch(
        "https://api.openai.com/v1/completions",
        requestOptions
      );
      if (response.status !== 200) {
        console.log(response.statusText);
        console.log(response.status);
        console.log(await response.text());
        return "";
      }

      const data = await response.json();
      console.log("choices:", data.choices);
      return data.choices[0]?.text;
    } catch (e) {
      console.log(e);
      return "returning from error";
    }
  }

  async function openaiRequest(key, prompt, stop, needsRepetition) {
    if (!key || key?.length <= 0) {
      return;
    }

    return await query(key, {
      model: "davinci",
      prompt,
      stop,
      top_p: 1,
      frequency_penalty: needsRepetition ? 0.1 : 0.4,
      presence_penalty: needsRepetition ? 0.1 : 0.4,
      temperature: 0.85,
      max_tokens: 256,
      best_of: 1,
    });
  }
  return async (prompt, stop, needsRepetition = true) => {
    return await openaiRequest(getOpenAIKey(), prompt, stop, needsRepetition);
  };
}

const run = async () => {
  const promises = [];

  // ********** OBJECT COMMENT **********
  async function generateObjectCommentTest() {
    const { name, description } = testData.objects[0];
    const prompt = makeCommentPrompt({ name, description, type: "Object" });

    const output = await generateObjectComment(
      { name, description },
      makeGenerateFn()
    );

    writeData(
      testData.objects[0],
      prompt,
      output.comment,
      "object_comment",
      makeCommentStop()
    );
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("objectcomment")
  ) {
    promises.push(generateObjectCommentTest);
  }

  // ********** NPC COMMENT **********
  async function generateNPCCommentTest() {
    const { name, description } = testData.npcs[0];
    const prompt = makeCommentPrompt({ name, description, type: "Character" });

    const output = await generateNPCComment(
      { name, description },
      makeGenerateFn()
    );

    writeData(
      testData.objects[0],
      prompt,
      output.comment,
      "npc_comment",
      makeCommentStop()
    );
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("npccomment")
  ) {
    promises.push(generateNPCCommentTest);
  }

  // ********** Mob COMMENT **********
  async function generateMobCommentTest() {
    const { name, description } = testData.mobs[0];
    const prompt = makeCommentPrompt({ name, description, type: "Character" });

    const output = await generateMobComment(
      { name, description },
      makeGenerateFn()
    );

    writeData(
      testData.objects[0],
      prompt,
      output.comment,
      "mob_comment",
      makeCommentStop()
    );
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("mobcomment")
  ) {
    promises.push(generateMobCommentTest);
  }

  // ********** LOCATION COMMENT **********
  async function generateLocationCommentTest() {
    const input = testData.locations[0];
    const prompt = makeCommentPrompt({ ...input, type: "location" });

    const output = await generateLocationComment(input, makeGenerateFn());

    writeData(
      input,
      prompt,
      output.comment,
      "location_comment",
      makeCommentStop()
    );
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("loadingcomment")
  ) {
    promises.push(generateLocationCommentTest);
  }

  // ********** SELECT CHARACTER **********
  async function generateSelectCharacterTest() {
    const input = testData.party[1];

    const prompt = makeSelectCharacterPrompt(input);

    const output = await generateSelectCharacter(input, makeGenerateFn());

    writeData(
      input,
      prompt,
      output.value,
      "select_character",
      makeSelectCharacterStop()
    );
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("selectcharacter")
  ) {
    promises.push(generateSelectCharacterTest);
  }

  // ********** LORE EXPOSITION **********

  async function generateExpositionObjectTest() {
    const input = {
      name: testData.objects[0].name,
      location:
        testData.locations[0].name + "\n" + testData.locations[0].description,
      type: "object",
    };
    const prompt = makeExpositionPrompt(input);
    const { name, description, comment } = await generateExposition(
      input,
      makeGenerateFn()
    );

    writeData(
      { name },
      prompt,
      description + (comment ? "\nQuote: " + comment : ""),
      "exposition_object",
      makeExpositionStop(input.type)
    );
  }

  async function generateExpositionCharacterTest() {
    const input = {
      name: testData.party[0].name,
      location: `${testData.locations[0].name}\n${testData.locations[0].description}`,
      type: "character",
    };
    const prompt = makeExpositionPrompt(input);

    let { name, description, comment } = await generateExposition(
      input,
      makeGenerateFn()
    );

    writeData(
      { name },
      prompt,
      description + (comment ? "\nQuote: " + comment : ""),
      "exposition_character",
      makeExpositionStop(input.type)
    );
  }

  async function generateExpositionLocationTest() {
    const input = {
      name: testData.locations[0].name,
      type: "location",
    };
    const prompt = makeExpositionPrompt(input);
    let { name, description, comment } = await generateExposition(
      input,
      makeGenerateFn()
    );

    writeData(
      { name },
      prompt,
      description + (comment ? "\nQuote: " + comment : ""),
      "exposition_location",
      makeExpositionStop(input.type)
    );
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("exposition")
  ) {
    promises.push(generateExpositionObjectTest);
    promises.push(generateExpositionCharacterTest);
    promises.push(generateExpositionLocationTest);
  }

  // ********** GENERATE NEW SCENE **********

  async function generateLocationTest() {
    const prompt = makeLocationPrompt();
    const { name, description, comment } = await generateLocation(
      makeGenerateFn()
    );
    const formattedOutput = `Location: "${name}" ${description}\nQuote: "${comment}"`;

    writeData("", prompt, formattedOutput, "location", makeLocationStop());
  }

  if (
    test.toLowerCase().includes("all") ||
    (test.toLowerCase().includes("location") &&
      !test.toLowerCase().includes("cutscene"))
  ) {
    promises.push(generateLocationTest);
  }

  // ********** GENERATE NEW CHARACTER **********

  async function generateCharacterTest() {
    const prompt = makeCharacterPrompt();
    const { name, description, comment } = await generateCharacter(
      makeGenerateFn()
    );
    const formattedOutput = `Character: "${name}" ${description}\nQuote: "${comment}"`;

    writeData("", prompt, formattedOutput, "character", makeCharacterStop());
  }

  if (
    test.toLowerCase().includes("all") ||
    (test.toLowerCase().includes("character") &&
      !test.toLowerCase().includes("comment"))
  ) {
    promises.push(generateCharacterTest);
  }

  // ********** GENERATE NEW OBJECT **********

  async function generateObjectTest() {
    const prompt = makeObjectPrompt();
    const { name, description, comment } = await generateObject(
      makeGenerateFn()
    );
    const formattedOutput = `Object: "${name}" ${description}\nQuote: "${comment}"`;

    console.log("*********** generateLocation:");
    console.log(formattedOutput);

    writeData("", prompt, formattedOutput, "object", makeObjectStop());
  }

  if (
    test.toLowerCase().includes("all") ||
    (test.toLowerCase().includes("object") &&
      !test.toLowerCase().includes("objectcomment"))
  ) {
    promises.push(generateObjectTest);
  }

  // ********** CHARACTER SELECTION INTRO **********

  async function generateCharacterIntroTest() {
    const { name, description } = testData.party[0];
    const prompt = makeCharacterIntroPrompt({ name, description });
    const { message, onselect } = await generateCharacterIntro(
      { name, description },
      makeGenerateFn()
    );

    //
    const output = `${name} (${description}): ${message}\n(onselect: ${onselect})`;
    console.log(output);

    writeData(
      { name, description },
      prompt,
      output,
      "character_intro_prompt",
      makeCharacterIntroStop()
    );
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("intro")
  ) {
    promises.push(generateCharacterIntroTest);
  }

  // ********** CHARACTER BATTLE INTRO **********

  async function generateBattleIntroductionTest() {
    const { name, description } = testData.party[0];
    const prompt = makeBattleIntroductionPrompt({ name });
    const { value } = await generateBattleIntroduction(
      { name, description },
      makeGenerateFn()
    );

    const output = `${name}: "${value}"`;
    console.log("prompt: ", prompt);
    console.log("output: ", output);

    writeData(
      { name, description },
      prompt,
      output,
      "battle_introduction",
      makeBattleIntroductionStop()
    );
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("battle")
  ) {
    promises.push(generateBattleIntroductionTest);
  }

  // ********** CUTSCENE **********

  // TODO: Make recursive to generate multiple until done = true or doneFactor = 1
  // Add NPCs and mobs
  // prompt should be more cutscene like

  async function generateCutsceneTest() {
    const messages = [];
    const input = {
      location: testData.locations[0],
      npcs: testData.npcs,
      mobs: testData.mobs,
      characters: testData.party,
      objects: testData.objects,
      messages,
    };
    const prompt = makeCutscenePrompt(input);

    // iterate 3 times or until done
    for (let i = 0; i < 3; i++) {
      input.messages = messages;
      const response = await generateCutscene(input, makeGenerateFn());
      console.log("response: ", response);
      const message = response[0];
      messages.push(message);
    }

    const output = messages
      .map((m) => {
        return m.name + ": " + m.message + " (done=" + m.done + ")";
      })
      .join("\n");

    writeData(input, prompt, output, "cutscene", makeCutsceneStop());
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("cutscene")
  ) {
    promises.push(generateCutsceneTest);
  }

  // ********** PARTY BANTER **********

  // TODO: Make recursive to generate multiple until done = true or doneFactor = 1
  async function generatePartyBanterTest() {
    const messages = [];
    const input = {
      location: testData.locations[0],
      characters: testData.party,
      objects: testData.objects,
      messages,
    };
    const prompt = makeBanterPrompt(input);

    // iterate 3 times or until done
    for (let i = 0; i < 3; i++) {
      const newMessages = await generateBanter(input, makeGenerateFn());
      // push all newMessages to messages
      messages.push(...newMessages);
    }

    const output = messages
      .map((m) => {
        return m.name + ": " + m.message;
      })
      .join("\n");

    writeData(input, prompt, output, "banter", makeBanterStop());
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("banter")
  ) {
    promises.push(generatePartyBanterTest);
  }

  // ********** RPG DIALOGUE **********

  async function generateRPGDialogTest() {
    const messages = [];
    const input = {
      location: testData.locations[0],
      characters: testData.party,
      objects: testData.objects,
      messages,
      dstCharacter: testData.npcs[0],
    };
    const prompt = input;
    // iterate 3 times or until done

    let end = false;
    while (!end && messages.length < 5) {
      const newMessages = await generateRPGDialogue(input, makeGenerateFn());
      // for each message in newMessages, check done -- if done, set done to true and break
      // otherwise push to messages
      for (let i = 0; i < newMessages.length; i++) {
        messages.push(newMessages[i]);
        if (newMessages[i].end) {
          end = true;
          break;
        }
      }
    }
    let output = messages
      .map((m) => {
        return m.type === "options"
          ? "OPTIONS: " + m.options
          : m.name + ": " + m.message;
      })
      .join("\n");
    console.log("messages", messages);

    // if the last message done is true, append *END* to the output
    if (messages.length > 0 && messages[messages.length - 1].end) {
      output += "\n*END*";
    }

    writeData(
      input,
      JSON.stringify(prompt),
      output,
      "rpg_dialogue",
      makeRPGDialogueStop()
    );
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("rpg")
  ) {
    promises.push(generateRPGDialogTest);
  }

  // ********** REACTIONS **********

  async function generateReactionTest() {
    console.log("Starting reaction test");
    const output = await generateReaction(
      testData.messages[0].speaker,
      testData.messages[0].message,
      makeGenerateFn()
    );

    console.log("*********** reaction:");
    console.log(output);

    const stop = makeReactionStop(
      testData.messages[0].speaker,
      testData.messages[0].message
    );
    const prompt = makeReactionPrompt(
      testData.messages[0].speaker,
      testData.messages[0].message
    );

    delete output.prompt;

    writeData(testData.messages[0], prompt, output.reaction, "reaction", stop);
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("reaction")
  ) {
    promises.push(generateReactionTest);
  }

  // ********** QUEST **********
  async function generateQuestTest() {
    const input = { location: testData.locations[0] };
    const prompt = makeQuestPrompt(input);
    const output = await generateQuest(input, makeGenerateFn());

    console.log("*********** generateQuest:");
    console.log(output);

    writeData(input, prompt, JSON.stringify(output), "quest", makeQuestStop());
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("quest")
  ) {
    promises.push(generateQuestTest);
  }

  async function generateChatMessageTest() {
    const outputs = [];
    let input = {
      messages: testData.messages,
      nextCharacter: testData.party[0],
    };
    const prompt = makeChatPrompt(input);
    // iterate over testData.party.length
    for (let i = 0; i < testData.party.length; i++) {
      input = { messages: testData.messages, nextCharacter: testData.party[i] };
      const _res = await generateChatMessage(input, makeGenerateFn());
      const value = _res?.value;
      const emote = _res?.emote;
      const done = _res?.value;

      outputs.push(`${testData.party[i].name}: ${value} (emote = ${emote})`);
      if (done) {
        break;
      }
    }
    console.log("*********** generateChatMessage:");
    console.log(JSON.stringify(outputs));

    writeData(
      { messages: testData.messages, nextCharacter: testData.party[0] },
      prompt,
      outputs.join("\n"),
      "chat_message",
      makeChatStop()
    );
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("chat")
  ) {
    promises.push(generateChatMessageTest);
  }

  async function generateDialogueOptionsTest() {
    const input = {
      messages: testData.messages,
      nextCharacter: testData.party[0],
    };
    const prompt = makeOptionsPrompt(input);
    const output = await generateDialogueOptions(input, makeGenerateFn());

    console.log("*********** generateDialogueOptions:");
    console.log(output);

    writeData(
      { messages: testData.messages, nextCharacter: testData.party[0] },
      prompt,
      output,
      "dialogue_options",
      makeRPGDialogueStop(input.nextCharacter.name)
    );
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("options")
  ) {
    promises.push(generateDialogueOptionsTest);
  }

  // ********** LORE GENERATION **********
  async function generateLoreTest() {
    const input = {
      settings: testData.locations,
      characters: [...testData.party, ...testData.npcs],
      messages: testData.messages,
      objects: testData.objects,
      dstCharacter: testData.party[1],
      localCharacter: testData.party[0],
    };

    const prompt = makeLorePrompt(input);

    const output = await generateLore(input, makeGenerateFn());

    console.log("*********** generateLore:");
    console.log(output);

    console.log("STOP:", makeLoreStop(input.localCharacter));

    writeData(
      input,
      prompt,
      output,
      "lore",
      makeLoreStop(input.localCharacter)
    );
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("lore")
  ) {
    promises.push(generateLoreTest);
  }

  async function generateLoreFileTest() {
    const input = {
      location: testData.locations[0],
      character: testData.party,
      npc: testData.npcs,
      mob: testData.mobs,
      object: testData.objects,
      header: exampleLoreFiles[0],
    };

    const prompt = makeLoreFilePrompt({
      location: input.location,
      party: [...input.character, ...input.npc],
      header: input.header,
      npcs: input.npc,
      objects: input.object,
    });

    const output = await generateLoreFile(input, makeGenerateFn());

    console.log("*********** generateLore:");
    console.log(output);

    writeData(input, prompt, output, "lore_file", ["\n\n", '"""']);
  }

  if (
    test.toLowerCase().includes("all") ||
    test.toLowerCase().includes("lorefile")
  ) {
    promises.push(generateLoreFileTest);
  }

  await Promise.all(promises.map((p) => p()));
  console.log("All tests complete");
};

run();

function writeData(inputs, prompt, output, name, stop) {
  const testOutputs = `./test_outputs`;
  if (!fs.existsSync(testOutputs)) {
    fs.mkdirSync(testOutputs);
  }
  const outputFile = `${testOutputs}/${name}.txt`;

  const write = `\
${
  inputs
    ? `\
******** INPUT DATA ********
${JSON.stringify(inputs, null, 2)}
`
    : ""
}
${
  stop
    ? `\
******** STOP CODE ********
${JSON.stringify(stop, null, 2)}
`
    : ""
}
${
  prompt
    ? `\
******** PROMPT ********
${prompt}
`
    : ""
}

******** OUTPUT DATA ********
${output}
`;

  fs.writeFileSync(outputFile, write);
  console.log(`Wrote ${outputFile}`);
}
