export class SimpleContext {
    scope;
    constructor(params) {
        this.scope = params?.scope || {};
    }
    setLocal(name, value) {
        this.scope[name] = value;
    }
    getLocal(name) {
        return this.scope[name];
    }
}
