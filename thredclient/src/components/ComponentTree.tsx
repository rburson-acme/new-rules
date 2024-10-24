import React, { ReactNode } from 'react';
import { TypeConfig } from '../screens/Admin/template/typeConfig';

/*
    ComponentTree builds a tree of React components based on a json structure.
    'type' corresponds to the component type to be created, while attributes are the props to be passed to the component.
    If an attribute is included in the type's typeConfig, then it is recursively transformed into a React component

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

type ComponentTreeProps = {
  root: any;
  typeConfig: TypeConfig;
  componentTypes: Record<string, React.ComponentType<any>>;
  props: any;
};
export const ComponentTree = ({ root, typeConfig, componentTypes, props }: ComponentTreeProps) => {
  const transformer = new Transformer(typeConfig, componentTypes);
  return Array.isArray(root) ? transformer.createArray(root, props) : transformer.createType(root, undefined, props);
};

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
  typeConfig: TypeConfig;
  componentTypes: Record<string, React.ComponentType<any>>;
  constructor(typeConfig: TypeConfig, componentTypes: Record<string, React.ComponentType<any>>) {
    this.typeConfig = typeConfig;
    this.componentTypes = componentTypes;
  }

  createType(item: any, index: number | undefined, props: any) {
    if (!item) return;
    const keys = Object.keys(item);
    if (keys.length === 1) {
      const type = keys[0];
      const itemValue = item[type];
      if (index !== undefined && itemValue.key === undefined) {
        itemValue.key = index;
      }
      return this.createItem(type, itemValue, props);
    }
    throw Error(`type node should only have a single key: the 'type' name.  found ${item}`);
  }

  createArray(arrayItem: any[], props: any) {
    return arrayItem?.map((item, index) => this.createType(item, index, props));
  }

  createItem(type: string, item: any, props: any) {
    const attrs = Object.keys(item);
    let children: any[] = [];
    const newProps = { ...props };
    attrs.map(attr => {
      const childItem = item[attr];
      if (this.shouldTransform(type, attr)) {
        if (Array.isArray(childItem)) {
          children = children.concat(this.createArray(childItem, props));
        } else {
          children.push(this.createType(childItem, undefined, props));
        }
      } else {
        newProps[attr] = childItem;
      }
    });
    return React.createElement(this.componentTypes[type], newProps, children);
  }

  shouldTransform(type: string, attr: string) {
    return this.typeConfig[type].attrsToTransform?.includes(attr);
  }
}
