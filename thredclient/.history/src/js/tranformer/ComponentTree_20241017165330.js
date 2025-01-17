import React from 'react';
import PropTypes from 'prop-types';

/*
    ComponentTree builds a tree of React components based on a json structure.
    'type' corresponds to the component type to be created, while attributes are the props to be passed to the component.
    If an attribute is included in the type's typeConfig, then it is recursively transformed into a React component
*/ 


/*
    This is the supported format
    {
        type: {
            attr1: {
                type: { ... }
            },
            attr2: [{
                type: {}, ...
            }]
            attr3: "some prop value"
        }
    }
*/

export const ComponentTree = ({ root, typeConfig, componentTypes, props }) => {
    const transformer = new Transformer(typeConfig, componentTypes);
    return Array.isArray(root) ? transformer.createArray(root, props) : transformer.createType(root, props);
}

ComponentTree.propTypes = { 
    root: PropTypes.oneOfType([PropTypes.array, PropTypes.object])
}

/*
    {
        type: {
            attr1: {
                type: { ... }
            },
            attr2: [{
                type: {}, ...
            }]
            attr3: "some prop value"
        }
    }
*/

class Transformer {

    constructor(typeConfig, componentTypes) {
        this.typeConfig = typeConfig;
        this.componentTypes = componentTypes;
    }

    createType(item, index, props) {
        if(!item) return;
        const keys = Object.keys(item);
        if(keys.length === 1) {
            const type = keys[0];
            const itemValue = item[type];
            if(index !== undefined && itemValue.key === undefined) {
                itemValue.key = index;
            }
            return this.createItem(type, itemValue, props);
        }
        throw Error(`type node should only have a single key: the 'type' name.  found ${item}`)
    }

    createArray(arrayItem, props) {
        return arrayItem?.map((item, index) => this.createType(item, index, props));
    }

    createItem(type, item, props)  {
        const attrs = Object.keys(item);
        let children = [];
        const newProps = { ...props };
        attrs.map(attr => {
            const childItem = item[attr];
            if(this.shouldTransform(type, attr)) {
                if(Array.isArray(childItem)) {
                   children = children.concat(this.createArray(childItem, props));
                } else {
                    children.push(this.createType(childItem, props));
                }
            } else {
                newProps[attr] = childItem;
            }
        });
        return React.createElement(this.componentTypes[type], newProps, children);
    }

    shouldTransform(type, attr) {
        return this.typeConfig[type]?.attrsToTransform?.includes(attr);
    }


}