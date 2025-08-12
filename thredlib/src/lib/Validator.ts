import {Ajv} from "ajv";
import eventSchema from '../schemas/event.json' with { type: 'json' };

type schemaParams = 'event' //as more schemas are added, add them here.
export class Validator{
    private ajv: Ajv = new Ajv();

    isDataValid(data:any, schema: schemaParams) {
        switch(schema){ // add more cases as more schemas are added
            case 'event':{ 
                const validate = this.ajv.compile(eventSchema);
                return validate(data);
            }
        }
        return false
    }
}
