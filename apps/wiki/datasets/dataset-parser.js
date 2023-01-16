export const formatItemText = (item, datasetSpec) => {
  const {
    nameKey,
  } = datasetSpec;

  let s = '';
  for (const k in item) {
    const v = item[k];
    if (s) {
      s += '\n';
    }
    if (k === nameKey) {
      s += `## ${k}: ${v}`;
    } else {
      s += `## ${k}:\n${v}`;
    }
  }
  return s;
};
export const formatTrainingItemCandidates = (item, datasetSpec) => {
  const {
    type,
    nameKey,
    descriptionKey,
  } = datasetSpec;

  const _getNameCompletion = () => {
    if (item[nameKey]) {
      const prompt = `@Type: ${type}\n## ${nameKey}:`
      const completion = `\n${item[nameKey]}\n\n`;
      return [
        {
          prompt,
          completion,
        },
      ];
    } else {
      return [];
    }
  };
  const _getDescriptionCompletion = () => {
    if (item[nameKey] && item[descriptionKey]) {
      const prompt = `@Type: ${type}\n\
## ${nameKey}:\n${item[nameKey]}\n\
## ${descriptionKey}:\
`;
      const completion = `\n${item[descriptionKey]}\n\n`;
      return [
        {
          prompt,
          completion,
        },
      ];
    } else {
      return [];
    }
  };
  const _getAttributeCompletions = () => {
    const basePrompt = `@Type: ${type}\n`;
    // const completion = formatItemText(item, ignoreKeys); */
    const formattedItems = [];
    const itemAttributeKeys = Object.keys(item);
    for (const k of itemAttributeKeys) {
      const prompt = `${basePrompt}## ${k}:`;
      const completion = `\n${item[k]}\n\n`;
      const formattedItem = {
        prompt,
        completion,
      };
      formattedItems.push(formattedItem);
    }
    return formattedItems;
  };
  return _getNameCompletion()
    .concat(_getDescriptionCompletion())
    .concat(_getAttributeCompletions());
};
export const formatDatasetNamePrompt = datasetSpec => {
  const {
    type,
    nameKey,
  } = datasetSpec;
  const prompt = `@Type: ${type}\n## ${nameKey}:`;
  return prompt;
};
export const formatDatasetDescriptionPrompt = (datasetSpec, name) => {
  const {
    type,
    nameKey,
    descriptionKey,
  } = datasetSpec;
  const prompt = `@Type: ${type}\n\
## ${nameKey}:\n\
${name}\n\
## ${descriptionKey}:`;
  return prompt;
};
export const formatDatasetAttributePrompts = (datasetSpec, name, description) => {
  const {
    type,
    nameKey,
    descriptionKey,
    attributeKeys,
  } = datasetSpec;
  
  const basePrompt = `@Type: ${type}\n\
## ${nameKey}:\n\
${name}\n\
## ${descriptionKey}:\n\
${description}\n\
`;
  const ignoreKeys = [
    nameKey,
    descriptionKey,
  ];
  return attributeKeys.filter(key => !ignoreKeys.includes(key)).map(key => {
    const prompt = `${basePrompt}## ${key}:`;
    return {
      key,
      prompt,
    };
  });
};
export const parseDatasetItems = (md, datasetSpec, {
  count = Infinity,
} = {}) => {
  const {
    // type,
    // nameKey,
    // descriptionKey,
    groupKey,
  } = datasetSpec;

  const items = [];
  const r = /([\s\S]+?)(?:\n\n|$)/g;
  let match2;
  while (match2 = r.exec(md)) {
    const itemString = match2[1];

    const itemAttributes = {};
    let currentAttributeName = '';
    let currentAttributeValue = '';
    let currentAttributeAsterisk = false;
    const _flushAttribute = () => {
      itemAttributes[currentAttributeName] = currentAttributeValue;
      if (currentAttributeAsterisk) {
        itemAttributes[currentAttributeName] = currentAttributeAsterisk;
      } 

      currentAttributeName = '';
      currentAttributeValue = '';
      currentAttributeAsterisk = false;
    };

    const itemLines = itemString.split('\n');
    for (let i = 0; i < itemLines.length; i++) {
      const itemLine = itemLines[i];

      const match3 = itemLine.match(/^([@#]+ ?[\s\S]+?)(\*?):(?: )?(.*)(?:\n|$)/);
      if (match3 /* && !isAllCaps(name) */) {
        const name = match3[1];
        const asterisk = match3[2];
        const value = match3[3];

        if (currentAttributeName) {
          _flushAttribute();
        }

        currentAttributeName = name.replace(/^[@#]+ ?/, '');
        currentAttributeValue = value;
        currentAttributeAsterisk = !!asterisk;
      } else {
        if (currentAttributeName) {
          if (currentAttributeName === groupKey) {
            const itemAttributesClone = {...itemAttributes};
            itemAttributesClone[currentAttributeName] = itemLine;
            items.push(itemAttributesClone);
            if (items.length >= count) {
              return items;
            }
          } else {
            if (currentAttributeValue) {
              currentAttributeValue += '\n';
            }
            currentAttributeValue += itemLine;
          }
        } else {
          throw new Error('did not have item attribute context: ' + JSON.stringify({itemString, itemLines}, null, 2));
        }
      }
    }
    if (currentAttributeName) {
      _flushAttribute();
    }

    items.push(itemAttributes);
    if (items.length >= count) {
      return items;
    }
  }
  return items;
};
export const parseDatasetSpec = md => {
  const match = md.match(/^([\s\S]*?)\n\n([\s\S]*)$/);
  if (match) {
    const prefix = match[1];
    const itemsMd = match[2];

    const datasetItems = parseDatasetItems(itemsMd, {
      count: 1,
    });
    const item0 = datasetItems[0];
    let itemKeys = Object.keys(item0);
    if (itemKeys.length >= 4) {
      const [
        typeKey,
        imagePromptKey,
        nameKey,
        descriptionKey,
        ...attributeKeys
      ] = itemKeys;
      const type = item0[typeKey];
      const imagePrompt = item0[imagePromptKey];
      // const attributeKeys = itemKeys.slice(2);
      const groupKey = attributeKeys.find(k => k.endsWith('*')) ?? null;
      return {
        type,
        imagePrompt,
        nameKey,
        descriptionKey,
        attributeKeys,
        groupKey,
        prefix,
      };
    } else {
      throw new Error('invalid dataset item keys: ' + JSON.stringify(itemKeys, null, 2));
    }
  } else {
    throw new Error('had no prefix: ' + JSON.stringify(md));
  }
};