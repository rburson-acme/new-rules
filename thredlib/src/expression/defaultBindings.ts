import { ExpressionParams } from './Expression.js';

export const defaultBindings = (params: ExpressionParams) => {

    const { event, context } = params;
    
    const local = (name: string) => context.getLocal(name);

    const setLocal = (name: string, value: any) => {
        context.setLocal(name, value);
    };

    const getEvent = () => event;
    const getData = () => getEvent()?.data;
    const getContent = () => getData()?.content;
    const getValues = () => { getContent()?.values };
    const valueNamed = (name: string) => getValues()?.[name];

    return {
        event: getEvent(),
        data: getData(),
        content: getContent(),
        values: getValues(),
        valueNamed,
        local,
        setLocal,
    };
};
