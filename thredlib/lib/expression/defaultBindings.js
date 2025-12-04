import { Events } from '../core/Events.js';
export const defaultBindings = (params) => {
    const { event, context } = params;
    const local = (name) => context.getLocal(name);
    const setLocal = (name, value) => {
        context.setLocal(name, value);
    };
    const getEvent = () => event;
    const getThredId = () => event.thredId || context.getThredId();
    const getData = () => Events.getData(event);
    const getAdvice = () => Events.getAdvice(event);
    const getContent = () => Events.getContent(event);
    const getValues = () => Events.getValues(event);
    const valueNamed = (name, _event) => Events.valueNamed(_event || event, name);
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
    };
};
