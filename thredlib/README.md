### Schemas

Schemas are created by running command

`npx typescript-json-schema tsconfig.json {TYPE_NAME} --out src/schemas/{schemaName}.json --ref false`

Add this generated json schema into the src/lib/Validator isDataValid method's switch statement, then use this function wherever is needed in the app.