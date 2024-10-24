// which 'attrs' should we traverse and transform
export type TypeConfig = Record<string, { attrsToTransform: string[] }>;
export const typeConfig: TypeConfig = {
  group: { attrsToTransform: ['items'] },
};
