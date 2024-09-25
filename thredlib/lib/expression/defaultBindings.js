export const defaultBindings = (params) => {
    const { event, context } = params;
    const local = (name) => context.getLocal(name);
    const setLocal = (name, value) => {
        context.setLocal(name, value);
    };
    const getEvent = () => event;
    const getData = () => getEvent()?.data;
    const getContent = () => getData()?.content;
    const getValues = () => getContent()?.values;
    const valueNamed = (name) => getValues()?.[name];
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
