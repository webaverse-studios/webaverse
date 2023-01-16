node format-training-data.js >openai-data.json
openai api fine_tunes.create -t openai-data.json -m 'davinci'