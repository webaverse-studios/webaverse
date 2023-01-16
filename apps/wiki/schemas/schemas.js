const schemas = [
  {
    "class": "Content",
    "description": "Webaverse content",
    "properties": [
      {
        "dataType": [
          "string"
        ],
        "description": "Title of the page",
        "name": "title"
      },
      {
        "dataType": [
          "string"
        ],
        "description": "Content of the page",
        "name": "content"
      },
      {
        "dataType": [
          "string"
        ],
        "description": "Type of content",
        "name": "type"
      },
    ],
  },
  {
    "class": "IpfsData",
    "description": "Webaverse IPFS link",
    "properties": [
      {
        "dataType": [
          "string"
        ],
        "description": "Title of the page",
        "name": "title"
      },
      {
        "dataType": [
          "string"
        ],
        "description": "IPFS hash",
        "name": "content"
      },
      {
        "dataType": [
          "string"
        ],
        "description": "Type of content",
        "name": "type"
      },
    ],
  },
];
export default schemas;