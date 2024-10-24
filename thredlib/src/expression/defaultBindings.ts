import { Events } from '../core/Events.js';
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
    const valueNamed = (name: string) => Events.valueNamed(event, name);

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
