import { Ajv } from "ajv";
import eventSchema from '../schemas/event.json';
export class Validator {
    ajv = new Ajv();
    isDataValid(data, schema) {
        switch (schema) { // add more cases as more schemas are added
            case 'event': {
                const validate = this.ajv.compile(eventSchema);
                return validate(data);
            }
        }
        return false;
    }
}
