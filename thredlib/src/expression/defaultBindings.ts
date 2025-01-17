import { Events } from '../core/Events.js';
import { Event } from '../core/Event.js';
import { ExpressionParams } from './Expression.js';

export const defaultBindings = (params: ExpressionParams) => {

    const { event, context } = params;
    
    const local = (name: string) => context.getLocal(name);

    const setLocal = (name: string, value: any) => {
        context.setLocal(name, value);
    };

    const getEvent = () => event;
    const getData = () => Events.getData(event);
    const getAdvice = () => Events.getAdvice(event);
    const getContent = () => Events.getContent(event);
    const getValues = () => Events.getValues(event);
    const valueNamed = (name: string, _event?: Event) => Events.valueNamed(_event || event, name);


    // to use these in an expression:
    // $event, $data, $advice, $content, $values, $valueNamed('name'), $local('name'), $setLocal('name', value)
    return {
        event: getEvent(),
        data: getData(),
        advice: getAdvice(),
        content: getContent(),
        values: getValues(),
        valueNamed,
        local,
        setLocal,
    };
};
