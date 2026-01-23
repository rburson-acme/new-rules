import { Events } from '../core/Events.js';
import { Event } from '../core/Event.js';
import { ExpressionParams } from './Expression.js';

export const OUTPUT_EVENT_ID_PREFIX = 'out_id_';

export const defaultBindings = (params: ExpressionParams) => {

    const { event, context } = params;
    
    const local = (name: string) => context.getLocal(name);

    const setLocal = (name: string, value: any) => {
        context.setLocal(name, value);
    };

    const getEvent = () => event;
    const getThredId = () => event.thredId || context.getThredId();
    const getData = () => Events.getData(event);
    const getAdvice = () => Events.getAdvice(event);
    const getContent = () => Events.getContent(event);
    const getValues = () => Events.getValues(event);
    const valueNamed = (name: string, _event?: Event) => Events.valueNamed(_event || event, name);
    const isResponseFor = (transformName: string): boolean => {
        const outputEventId = context.getLocal(`${OUTPUT_EVENT_ID_PREFIX}${transformName}`);
        return outputEventId !== undefined && event.re === outputEventId;
    }


    // to use these in an expression:
    // $event, $thredId, $data, $advice, $content, $values, $valueNamed('name'), $local('name'), $setLocal('name', value)
    return {
        event: getEvent(),
        thredId: getThredId(),
        advice: getAdvice(),
        content: getContent(),
        data: getData(),
        values: getValues(),
        valueNamed,
        local,
        setLocal,
        isResponseFor
    };
};
