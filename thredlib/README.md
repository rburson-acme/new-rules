### Schemas

Schemas are created by running command

`npx ts-json-schema-generator --path '{typeLocation} --type '{TYPE_NAME}' -o src/schemas/{schemaName}.json`


Add this generated json schema into the src/lib/Validator isDataValid method's switch statement, then use this function wherever is needed in the app.

Add the below JSON to your settings.json file within vscode and then change the urls to recieve JSON type validation within the corresponding JSON files

```json
json.schemas": [
    {
      "fileMatch": [
        "*/event*.json"
      ],
      "url": "/Users/jarred/Desktop/Work/new-rules/srvthreds/src/ts/thredlib/schemas/event.json"
    },
    {
      "fileMatch": [
        "*/pattern*.json"
      ],
      "url": "/Users/jarred/Desktop/Work/new-rules/srvthreds/src/ts/thredlib/schemas/pattern.json"
    }
  ]
  ```